import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Auto-logout after 30 minutes of user inactivity.
 *
 * - Updates `sageline_last_activity` in localStorage on real user events.
 * - Runs a ~1-minute wake-up check (cheap, out of NgZone) that compares now
 *   against the last-activity timestamp and logs out if the idle window is
 *   exceeded. This also covers the "came back after a long sleep" case where
 *   a raw setTimeout would have fired immediately with an outdated threshold.
 *
 * Kicked off in AppComponent after the user is authenticated.
 */
@Injectable({ providedIn: 'root' })
export class IdleService implements OnDestroy {

  /** Events that count as user interaction. */
  private static readonly ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
    'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click'
  ];

  /** Polling interval for the idle check. */
  private static readonly CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

  /** Minimum time between two localStorage writes (throttle). */
  private static readonly WRITE_THROTTLE_MS = 15 * 1000; // 15 seconds

  private started = false;
  private checkHandle: any = null;
  private lastWrite = 0;
  private boundHandler = (_e: Event) => this.onActivity();

  constructor(private authService: AuthService, private zone: NgZone) {}

  /** Start tracking user activity. Idempotent. */
  start(): void {
    if (this.started) return;
    this.started = true;

    // First touch — user is clearly active right now
    this.authService.touchLastActivity();
    this.lastWrite = Date.now();

    // Attach listeners outside Angular's zone to avoid triggering change
    // detection on every mousemove.
    this.zone.runOutsideAngular(() => {
      for (const evt of IdleService.ACTIVITY_EVENTS) {
        window.addEventListener(evt, this.boundHandler, { passive: true });
      }
      this.checkHandle = setInterval(
        () => this.checkIdle(),
        IdleService.CHECK_INTERVAL_MS
      );
    });
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;

    for (const evt of IdleService.ACTIVITY_EVENTS) {
      window.removeEventListener(evt, this.boundHandler);
    }
    if (this.checkHandle) {
      clearInterval(this.checkHandle);
      this.checkHandle = null;
    }
  }

  /** Called on every tracked DOM event. Throttled so we don't hammer localStorage. */
  private onActivity(): void {
    const now = Date.now();
    if (now - this.lastWrite < IdleService.WRITE_THROTTLE_MS) return;
    this.lastWrite = now;
    this.authService.touchLastActivity();
  }

  /** Periodic check — if we're past the idle window, log the user out. */
  private checkIdle(): void {
    if (!this.authService.hasFreshPersistedSession()) {
      // Either no session anymore, or it's gone idle — force logout.
      this.zone.run(() => {
        this.stop();
        this.authService.logout();
      });
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
