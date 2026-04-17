// src/app/messaging/conversation-list/conversation-list.component.ts

import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Conversation } from '../../models/conversation.model';
import { AuthService } from '../../auth/auth.service';
import { MessageApiService } from '../../services/message.service';
import { UserService } from '../../services/user.service';
import { ConversationType } from '../../shared/enums/messaging-enums';
import { User } from '../../models/user.model';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss']
})
export class ConversationListComponent implements OnInit, OnDestroy {

  @Output() conversationSelected = new EventEmitter<Conversation>();

  // ── Conversations ────────────────────────────────────────────────────────────
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  currentUserId: number = 0;
  loading = true;

  // ── New conversation dialog ──────────────────────────────────────────────────
  showNewConversationDialog = false;
  availableUsers: User[] = [];
  filteredAvailableUsers: User[] = [];
  selectedNewUserId: number | null = null;
  userSearchQuery = '';
  creatingConversation = false;

  constructor(
    private messageApi: MessageApiService,
    private wsService: WebSocketService,
    private authService: AuthService,
    private userService: UserService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadConversations();

    // Refresh list on incoming message events
    this.wsService.subscribe(
      `/topic/notifications.${this.currentUserId}`,
      (msg: any) => {
        if (msg.type === 'NEW_MESSAGE' || msg.notificationType) {
          this.loadConversations();
        }
      }
    );
  }

  // ── Conversations ────────────────────────────────────────────────────────────

  loadConversations(): void {
    this.messageApi.getConversations(this.currentUserId).subscribe({
      next: (data) => {
        this.conversations = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  selectConversation(conv: Conversation): void {
    this.selectedConversation = conv;
    this.conversationSelected.emit(conv);

    if (conv.unreadCount > 0) {
      this.messageApi.markAsRead(conv.id, this.currentUserId).subscribe(() => {
        conv.unreadCount = 0;
      });
    }
  }

  getOtherParticipant(conv: Conversation): { username: string; role: string } {
    if (conv.participantOneId === this.currentUserId) {
      return { username: conv.participantTwoUsername, role: conv.participantTwoRole };
    }
    return { username: conv.participantOneUsername, role: conv.participantOneRole };
  }

  getConversationIcon(conv: Conversation): string {
    switch (conv.type) {
      case ConversationType.LINE_ASSIGNMENT:       return 'pi pi-cog';
      case ConversationType.VALIDATION_ASSIGNMENT: return 'pi pi-check-circle';
      default:                                     return 'pi pi-comments';
    }
  }

  getConversationLabel(conv: Conversation): string {
    switch (conv.type) {
      case ConversationType.LINE_ASSIGNMENT:       return 'Affectation Ligne';
      case ConversationType.VALIDATION_ASSIGNMENT: return 'Validation';
      default:                                     return 'Message direct';
    }
  }

  getTagSeverity(conv: Conversation): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    switch (conv.type) {
      case ConversationType.VALIDATION_ASSIGNMENT: return 'warning';
      case ConversationType.LINE_ASSIGNMENT:       return 'info';
      default:                                     return 'success';
    }
  }

  // ── New conversation dialog ──────────────────────────────────────────────────

  openNewConversationDialog(): void {
    this.showNewConversationDialog = true;
    this.selectedNewUserId = null;
    this.userSearchQuery = '';
    this.loadAvailableUsers();
  }

  closeNewConversationDialog(): void {
    this.showNewConversationDialog = false;
    this.selectedNewUserId = null;
    this.userSearchQuery = '';
  }

  loadAvailableUsers(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.availableUsers = users.filter(u => u.id !== this.currentUserId);
        this.filteredAvailableUsers = [...this.availableUsers];
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les utilisateurs'
        });
      }
    });
  }

  filterUsers(): void {
    const q = this.userSearchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredAvailableUsers = [...this.availableUsers];
      return;
    }
    this.filteredAvailableUsers = this.availableUsers.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  }

  startConversation(): void {
    if (!this.selectedNewUserId || this.creatingConversation) return;

    this.creatingConversation = true;

    this.messageApi.getOrCreateConversation(this.currentUserId, this.selectedNewUserId)
      .subscribe({
        next: (conv) => {
          this.creatingConversation = false;
          this.closeNewConversationDialog();
          this.loadConversations();

          // Auto-select the newly created conversation once the list reloads
          setTimeout(() => {
            const found = this.conversations.find(c => c.id === conv.id);
            if (found) this.selectConversation(found);
            else this.conversationSelected.emit(conv);
          }, 300);

          this.messageService.add({
            severity: 'success',
            summary: 'Conversation créée',
            detail: 'Vous pouvez maintenant envoyer un message.'
          });
        },
        error: (err) => {
          this.creatingConversation = false;
          console.error('Error creating conversation:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: err.error?.message || 'Impossible de créer la conversation. Vérifiez votre backend.'
          });
        }
      });
  }

  // ── Avatar / role helpers ────────────────────────────────────────────────────

  getInitials(user: User): string {
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  }

  getAvatarColor(user: User): string {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
    ];
    let hash = 0;
    for (let i = 0; i < user.username.length; i++) {
      hash = user.username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      ADMIN_IT:     'Admin IT',
      CHEF_SECTEUR: 'Chef Secteur',
      EXPERT:       'Expert',
      TECH_VAL:     'Tech Val.',
      TECH_PREP:    'Tech Prép.',
      RESPONSABLE:  'Responsable'
    };
    return labels[role] || role;
  }

  getRoleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const sev: Record<string, any> = {
      ADMIN_IT:     'danger',
      CHEF_SECTEUR: 'warning',
      EXPERT:       'info',
      TECH_VAL:     'success',
      TECH_PREP:    'secondary',
      RESPONSABLE:  'info'
    };
    return sev[role] || 'secondary';
  }

  ngOnDestroy(): void {
    this.wsService.unsubscribe(`/topic/notifications.${this.currentUserId}`);
  }
}
