// src/app/services/message-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { Conversation } from '../models/conversation.model';
import { ChatMessage, MessageRequest } from '../models/message.model';
import { AppNotification, UnreadCount } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class MessageApiService {

  private baseUrl = `${environment.apiUrl}/messages`;
  private notifUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  // =====================================================
  // CONVERSATIONS
  // =====================================================

  getConversations(userId: number): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.baseUrl}/conversations/${userId}`);
  }

  getOrCreateConversation(userOneId: number, userTwoId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.baseUrl}/conversations`, {
      userOneId, userTwoId
    });
  }

  // =====================================================
  // MESSAGES
  // =====================================================

  getMessages(conversationId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.baseUrl}/conversation/${conversationId}`
    );
  }

  sendMessage(request: MessageRequest): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(this.baseUrl, request);
  }

  markAsRead(conversationId: number, userId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/conversation/${conversationId}/read/${userId}`, {}
    );
  }

  getUnreadCount(userId: number): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.baseUrl}/unread-count/${userId}`);
  }

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  getNotifications(userId: number): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.notifUrl}/${userId}`);
  }

  getUnreadNotifications(userId: number): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.notifUrl}/${userId}/unread`);
  }

  getUnreadNotifCount(userId: number): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.notifUrl}/${userId}/unread-count`);
  }

  markNotifAsRead(notificationId: number): Observable<void> {
    return this.http.patch<void>(`${this.notifUrl}/${notificationId}/read`, {});
  }

  markAllNotifsAsRead(userId: number): Observable<void> {
    return this.http.patch<void>(`${this.notifUrl}/${userId}/read-all`, {});
  }
}