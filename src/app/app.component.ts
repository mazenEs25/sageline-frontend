import { Component, OnInit } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';
import { WebSocketService } from './services/websocket.service';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'sageline-frontend';

  constructor(
    private primengConfig: PrimeNGConfig,
    private wsService: WebSocketService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    this.primengConfig.ripple = true;

    // User ID is resolved during login (stored in localStorage).
    // Here we just connect WebSocket if already authenticated.
    if (await this.authService.isAuthenticated()) {
      const userId = this.authService.getCurrentUserId();
      if (userId > 0) {
        this.wsService.connect(userId);
      }
    }
  }
}