// src/app/messaging/notification-panel/notification-panel.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
import { WebSocketService } from '../../services/websocket.service';
import { AppNotification } from '../../models/notification.model';
import { AuthService } from '../../auth/auth.service';
import { MessageApiService } from '../../services/message.service';
import { NotificationType } from '../../shared/enums/messaging-enums';

@Component({
  selector: 'app-notification-panel',
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss']
})
export class NotificationPanelComponent implements OnInit, OnDestroy {

  @ViewChild('notifPanel') notifPanel!: OverlayPanel;

  notifications: AppNotification[] = [];
  unreadCount = 0;
  currentUserId: number = 0;
  loading = false;
  activeTab: 'all' | 'unread' = 'unread';
  private subscribed = false;

  constructor(
    private messageApi: MessageApiService,
    private wsService: WebSocketService,
    private authService: AuthService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();

    if (this.currentUserId > 0) {
      this.loadUnreadCount();

      // Subscribe once WebSocket is ready
      this.wsService.isConnected$.subscribe(connected => {
        if (connected && !this.subscribed) {
          this.subscribed = true;
          this.subscribeToNotifications();
        }
      });
    }
  }

  /**
   * Charger le compteur de notifications non lues
   */
  loadUnreadCount(): void {
    this.messageApi.getUnreadNotifCount(this.currentUserId).subscribe({
      next: (data) => this.unreadCount = data.count
    });
  }

  /**
   * Charger les notifications selon le tab actif
   */
  loadNotifications(): void {
    this.loading = true;

    const obs = this.activeTab === 'unread'
      ? this.messageApi.getUnreadNotifications(this.currentUserId)
      : this.messageApi.getNotifications(this.currentUserId);

    obs.subscribe({
      next: (data) => {
        this.notifications = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  /**
   * Écouter les notifications push en temps réel
   */
  subscribeToNotifications(): void {
    this.wsService.subscribe(
      `/topic/notifications.${this.currentUserId}`,
      (msg: any) => {
        console.log('Notification received:', msg);

        // Handle both notification objects AND new message events
        if (msg.id && msg.notificationType) {
          // Full notification object from NotificationService
          this.unreadCount++;
          if (this.notifications.length > 0) {
            this.notifications.unshift(msg);
          }
        } else if (msg.type === 'NEW_MESSAGE' || msg.conversationId) {
          // Simple new message event from MessageService
          this.unreadCount++;
        }
      }
    );
  }

  /**
   * Ouvrir le panel overlay
   */
  togglePanel(event: Event): void {
    this.notifPanel.toggle(event);
    // Charger les notifications à l'ouverture
    this.loadNotifications();
  }

  /**
   * Changer de tab (Toutes / Non lues)
   */
  switchTab(tab: 'all' | 'unread'): void {
    this.activeTab = tab;
    this.loadNotifications();
  }

  /**
   * Cliquer sur une notification → marquer comme lue + naviguer
   */
  onNotificationClick(notif: AppNotification): void {
    // Marquer comme lue (guard against undefined id)
    if (!notif.read && notif.id) {
      this.messageApi.markNotifAsRead(notif.id).subscribe(() => {
        notif.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }

    // Fermer le panel
    this.notifPanel.hide();

    // Naviguer selon le type
    switch (notif.notificationType) {
      case NotificationType.LINE_ASSIGNED:
        this.router.navigate(['/messaging']);
        break;

      case NotificationType.VALIDATION_ASSIGNED:
        if (notif.referenceId) {
          this.router.navigate(['/validations', notif.referenceId]);
        } else {
          this.router.navigate(['/messaging']);
        }
        break;

      case NotificationType.VALIDATION_CLOSED:
        if (notif.referenceId) {
          this.router.navigate(['/validations', notif.referenceId]);
        }
        break;

      case NotificationType.AI_ALERT:
        if (notif.referenceId) {
          this.router.navigate(['/validations', notif.referenceId]);
        } else {
          this.router.navigate(['/intelligence']);
        }
        break;

      case NotificationType.NEW_MESSAGE:
        this.router.navigate(['/messaging']);
        break;

      default:
        this.router.navigate(['/messaging']);
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllAsRead(): void {
    this.messageApi.markAllNotifsAsRead(this.currentUserId).subscribe(() => {
      this.unreadCount = 0;
      this.notifications.forEach(n => n.read = true);
    });
  }

  /**
   * Icône selon le type de notification
   */
  getNotifIcon(notif: AppNotification): string {
    switch (notif.notificationType) {
      case NotificationType.LINE_ASSIGNED:
        return 'pi pi-cog';
      case NotificationType.VALIDATION_ASSIGNED:
        return 'pi pi-check-circle';
      case NotificationType.VALIDATION_CLOSED:
        return 'pi pi-flag';
      case NotificationType.AI_ALERT:
        return 'pi pi-exclamation-triangle';
      case NotificationType.NEW_MESSAGE:
        return 'pi pi-envelope';
      default:
        return 'pi pi-info-circle';
    }
  }

  /**
   * Couleur selon le type
   */
  getNotifColor(notif: AppNotification): string {
    switch (notif.notificationType) {
      case NotificationType.AI_ALERT:
        return '#ef4444';
      case NotificationType.VALIDATION_ASSIGNED:
        return '#f59e0b';
      case NotificationType.LINE_ASSIGNED:
        return '#3b82f6';
      case NotificationType.VALIDATION_CLOSED:
        return '#22c55e';
      case NotificationType.NEW_MESSAGE:
        return '#8b5cf6';
      default:
        return '#64748b';
    }
  }

  /**
   * Temps relatif (il y a X minutes)
   */
  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  }

  ngOnDestroy(): void {
    this.wsService.unsubscribe(`/topic/notifications.${this.currentUserId}`);
  }
}