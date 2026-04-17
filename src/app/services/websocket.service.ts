// src/app/services/websocket.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client!: Client;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connected$ = new BehaviorSubject<boolean>(false);

  // Real-time ticket event stream (for UI updates on ticket detail pages)
  private ticketNotification$ = new BehaviorSubject<any>(null);

  get isConnected$(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  get ticketNotifications$(): Observable<any> {
    return this.ticketNotification$.asObservable();
  }

  connect(userId: number): void {
    if (this.client?.active) return;

    // Construire l'URL WebSocket à partir de l'API URL
    // environment.apiUrl = 'http://localhost:8089/api'
    // On veut : 'http://localhost:8089/ws'
    const wsUrl = environment.apiUrl.replace('/api', '') + '/ws';

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {},
      debug: (str) => {
        // Décommenter pour debug :
        // console.log('STOMP:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        console.log('✅ WebSocket connecté');
        this.connected$.next(true);

        // Enregistrer la présence utilisateur
        this.send('/app/status.connect', { senderId: userId });

        // Subscribe to ticket-specific notifications
        this.subscribe(`/user/${userId}/queue/tickets`, (notification: any) => {
          this.ticketNotification$.next(notification);
        });
      },

      onStompError: (frame) => {
        console.error('❌ Erreur STOMP:', frame.headers['message']);
        this.connected$.next(false);
      },

      onDisconnect: () => {
        console.log('🔌 WebSocket déconnecté');
        this.connected$.next(false);
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    if (this.client?.active) {
      this.client.deactivate();
    }
    this.connected$.next(false);
  }

  /**
   * S'abonner à un topic STOMP.
   * Gère automatiquement l'attente de connexion.
   */
  subscribe(topic: string, callback: (message: any) => void): void {
    // Éviter les doublons
    if (this.subscriptions.has(topic)) return;

    const doSubscribe = () => {
      if (this.client?.connected) {
        const sub = this.client.subscribe(topic, (msg: IMessage) => {
          try {
            callback(JSON.parse(msg.body));
          } catch {
            callback(msg.body);
          }
        });
        this.subscriptions.set(topic, sub);
      } else {
        // Réessayer dans 500ms si pas encore connecté
        setTimeout(doSubscribe, 500);
      }
    };

    doSubscribe();
  }

  unsubscribe(topic: string): void {
    const sub = this.subscriptions.get(topic);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(topic);
    }
  }

  /**
   * Envoyer un message STOMP au serveur
   */
  send(destination: string, body: any): void {
    if (this.client?.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body)
      });
    }
  }

  sendChatMessage(conversationId: number, senderId: number, content: string): void {
    this.send('/app/chat.send', { conversationId, senderId, content });
  }

  sendTyping(conversationId: number, senderId: number): void {
    this.send('/app/chat.typing', { conversationId, senderId });
  }

  sendReadReceipt(conversationId: number, userId: number): void {
    this.send('/app/chat.read', { conversationId, senderId: userId });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}