import { Component, OnInit } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';
import { WebSocketService } from './services/websocket.service';
import { AuthService } from './auth/auth.service';
import { IdleService } from './auth/idle.service';

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
    private authService: AuthService,
    private idleService: IdleService
  ) {}

  async ngOnInit(): Promise<void> {
    this.primengConfig.ripple = true;

    if (await this.authService.isAuthenticated()) {
      // Begin idle tracking — auto-logout after 30 min without interaction
      this.idleService.start();

      this.authService.syncCurrentUser().subscribe({
        next: () => {
          const userId = this.authService.getCurrentUserId();
          if (userId > 0) {
            this.wsService.connect(userId);
          }
        },
        error: () => {
          // Fallback: connect with cached ID if /users/me fails
          const userId = this.authService.getCurrentUserId();
          if (userId > 0) {
            this.wsService.connect(userId);
          }
        }
      });
    }
  }
}
