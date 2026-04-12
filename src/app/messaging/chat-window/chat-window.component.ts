// src/app/messaging/chat-window/chat-window.component.ts

import {
  Component, Input, OnChanges, OnDestroy, SimpleChanges,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Conversation } from '../../models/conversation.model';
import { ChatMessage } from '../../models/message.model';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { MessageApiService } from '../../services/message.service';
import { ConversationType } from '../../shared/enums/messaging-enums';

@Component({
  selector: 'app-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss']
})
export class ChatWindowComponent implements OnChanges, OnDestroy, AfterViewChecked {

  @Input() conversation: Conversation | null = null;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  currentUserId: number = 0;
  currentUsername: string = '';
  loading = false;
  isTyping = false;
  typingUser = '';

  private shouldScroll = false;
  private typingSubject = new Subject<void>();
  private typingTimeout: any;
  private currentTopicSubscription: string | null = null;

  constructor(
    private messageApi: MessageApiService,
    private wsService: WebSocketService,
    private authService: AuthService
  ) {
    this.currentUserId = this.authService.getCurrentUserId();
    this.currentUsername = this.authService.getUsername();

    // Debounce typing indicator — envoyer max 1 fois par 500ms
    this.typingSubject.pipe(debounceTime(500)).subscribe(() => {
      if (this.conversation) {
        this.wsService.sendTyping(this.conversation.id, this.currentUserId);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation'] && this.conversation && this.conversation.id) {
      this.loadMessages();
      this.subscribeToConversation();
    }
  }

  loadMessages(): void {
    if (!this.conversation?.id) return;
    this.loading = true;

    this.messageApi.getMessages(this.conversation.id).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.loading = false;
        this.shouldScroll = true;

        // Marquer comme lu
        this.messageApi.markAsRead(this.conversation!.id, this.currentUserId)
          .subscribe();
      },
      error: () => this.loading = false
    });
  }

  subscribeToConversation(): void {
    if (!this.conversation?.id) return;

    // Se désabonner de l'ancien topic
    if (this.currentTopicSubscription) {
      this.wsService.unsubscribe(this.currentTopicSubscription);
    }

    const topic = `/topic/chat.${this.conversation.id}`;
    this.currentTopicSubscription = topic;
    // The WebSocketService.subscribe() already has a retry loop,
    // but let's add a log to confirm it subscribes
    console.log('Subscribing to topic:', topic);

    this.wsService.subscribe(topic, (msg: any) => {
      console.log('Received on topic:', msg);
      // Typing indicator
      if (msg.type === 'TYPING' && msg.senderId !== this.currentUserId) {
        this.isTyping = true;
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => this.isTyping = false, 3000);
        return;
      }

      // Read receipt
      if (msg.type === 'READ_RECEIPT') {
        this.messages.forEach(m => {
          if (m.senderId === this.currentUserId && !m.readAt) {
            m.readAt = msg.readAt;
          }
        });
        return;
      }

      // Nouveau message
      if (msg.id && !this.messages.find(m => m.id === msg.id)) {
        this.messages.push(msg);
        this.shouldScroll = true;
        this.isTyping = false;

        // Auto-marquer comme lu si on a la conversation ouverte
        if (msg.senderId !== this.currentUserId) {
          this.wsService.sendReadReceipt(this.conversation!.id, this.currentUserId);
        }
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.conversation) return;

    // Envoyer via WebSocket pour la réactivité temps réel
    this.wsService.sendChatMessage(
      this.conversation.id,
      this.currentUserId,
      this.newMessage.trim()
    );

    this.newMessage = '';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onTyping(): void {
    this.typingSubject.next();
  }

  isOwnMessage(msg: ChatMessage): boolean {
    return msg.senderId === this.currentUserId;
  }

  getOtherParticipantName(): string {
    if (!this.conversation) return '';
    return this.conversation.participantOneId === this.currentUserId
      ? this.conversation.participantTwoUsername
      : this.conversation.participantOneUsername;
  }

  getConversationContextLabel(): string {
    if (!this.conversation) return '';
    switch (this.conversation.type) {
      case ConversationType.LINE_ASSIGNMENT:
        return 'Affectation Ligne';
      case ConversationType.VALIDATION_ASSIGNMENT:
        return `Validation #${this.conversation.referenceId}`;
      default:
        return 'Conversation directe';
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (err) { }
  }

  ngOnDestroy(): void {
    if (this.currentTopicSubscription) {
      this.wsService.unsubscribe(this.currentTopicSubscription);
    }
    clearTimeout(this.typingTimeout);
  }
}