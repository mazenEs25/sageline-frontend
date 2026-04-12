// src/app/messaging/messaging-page/messaging-page.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { Conversation } from '../../models/conversation.model';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-messaging-page',
  templateUrl: './messaging-page.component.html',
  styleUrls: ['./messaging-page.component.scss']
})
export class MessagingPageComponent implements OnInit, OnDestroy {

  selectedConversation: Conversation | null = null;
  currentUserId: number = 0;

  constructor(
    private wsService: WebSocketService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.wsService.connect(this.currentUserId);
  }

  onConversationSelected(conv: Conversation): void {
    console.log('Conversation selected:', conv);

    this.selectedConversation = conv;
  }

  ngOnDestroy(): void {
    // Ne pas déconnecter ici — le WebSocket reste actif
    // pour les notifications même hors de la page messagerie.
    // La déconnexion se fait au logout via AuthService.
  }
}