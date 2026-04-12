// src/app/messaging/conversation-list/conversation-list.component.ts

import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Conversation } from '../../models/conversation.model';
import { AuthService } from '../../auth/auth.service';
import { MessageApiService } from '../../services/message.service';
import { ConversationType } from '../../shared/enums/messaging-enums';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss']
})
export class ConversationListComponent implements OnInit, OnDestroy {

  @Output() conversationSelected = new EventEmitter<Conversation>();

  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  currentUserId: number = 0;
  loading = true;

  constructor(
    private messageApi: MessageApiService,
    private wsService: WebSocketService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadConversations();

    // Écouter les nouvelles notifications pour rafraîchir la liste
    this.wsService.subscribe(
      `/topic/notifications.${this.currentUserId}`,
      (msg: any) => {
        if (msg.type === 'NEW_MESSAGE' || msg.notificationType) {
          this.loadConversations();
        }
      }
    );
  }

  loadConversations(): void {
    this.messageApi.getConversations(this.currentUserId).subscribe({
      next: (data) => {
        console.log('Raw conversations from API:', JSON.stringify(data));

        this.conversations = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  selectConversation(conv: Conversation): void {
    console.log('Clicked conv object:', conv);
    console.log('Conv ID:', conv.id);
    this.selectedConversation = conv;
    this.conversationSelected.emit(conv);

    // Marquer comme lu
    if (conv.unreadCount > 0) {
      this.messageApi.markAsRead(conv.id, this.currentUserId).subscribe(() => {
        conv.unreadCount = 0;
      });
    }
  }

  getOtherParticipant(conv: Conversation): { username: string; role: string } {
    if (conv.participantOneId === this.currentUserId) {
      return {
        username: conv.participantTwoUsername,
        role: conv.participantTwoRole
      };
    }
    return {
      username: conv.participantOneUsername,
      role: conv.participantOneRole
    };
  }

  getConversationIcon(conv: Conversation): string {
    switch (conv.type) {
      case ConversationType.LINE_ASSIGNMENT:
        return 'pi pi-cog';
      case ConversationType.VALIDATION_ASSIGNMENT:
        return 'pi pi-check-circle';
      default:
        return 'pi pi-comments';
    }
  }

  getConversationLabel(conv: Conversation): string {
    switch (conv.type) {
      case ConversationType.LINE_ASSIGNMENT:
        return 'Affectation Ligne';
      case ConversationType.VALIDATION_ASSIGNMENT:
        return 'Validation';
      default:
        return 'Message direct';
    }
  }

  getTagSeverity(conv: Conversation): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    switch (conv.type) {
      case ConversationType.VALIDATION_ASSIGNMENT:
        return 'warning';
      case ConversationType.LINE_ASSIGNMENT:
        return 'info';
      default:
        return 'success';
    }
  }

  ngOnDestroy(): void {
    this.wsService.unsubscribe(`/topic/notifications.${this.currentUserId}`);
  }
}