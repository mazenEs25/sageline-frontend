# Research: Handover System — Angular Frontend

**Feature**: 001-handover-frontend
**Date**: 2026-05-06
**Source**: Direct code inspection of `sageline-frontend/src/`

---

## R-001: TECH_VAL User Fetch Strategy

**Decision**: Use `UserService.getByRole(role: string): Observable<User[]>`

**Rationale**: This method already exists at `src/app/services/user.service.ts:33` and calls
`GET /api/users/role/{role}`. Calling `userService.getByRole('TECH_VAL')` returns the exact
list needed for the assignment dropdown without any new endpoint or client-side filtering.

**Alternatives considered**:
- `UserService.getAll()` + client filter — would over-fetch; rejected
- New dedicated endpoint — unnecessary; rejected

---

## R-002: WebSocket Ticket Notification Observable

**Decision**: Use `WebSocketService.ticketNotifications$` observable in `ticket-detail`
rather than calling `wsService.subscribe()` again.

**Rationale**: `WebSocketService.connect()` (line 54 of `websocket.service.ts`) already
subscribes to `/user/${userId}/queue/tickets` and pipes every message into the
`ticketNotification$` BehaviorSubject. `ticket-detail` should subscribe to the
**public observable** `wsService.ticketNotifications$` — this avoids a duplicate STOMP
subscription (which `WebSocketService` deduplicates anyway, but the pattern is cleaner).

**Pattern to use in `ticket-detail.component.ts`**:
```typescript
private wsSubscription?: Subscription;

ngOnInit(): void {
  this.wsSubscription = this.wsService.ticketNotifications$.subscribe(notification => {
    if (notification && notification.validationId === this.ticketId) {
      this.loadTicket();
    }
  });
}

ngOnDestroy(): void {
  this.wsSubscription?.unsubscribe();
}
```

**Alternatives considered**:
- `wsService.subscribe('/user/{id}/queue/tickets', ...)` in component — duplicate subscription
  (deduplicated but confusing); rejected

---

## R-003: Zone ID Storage for CHEF_SECTEUR WebSocket Subscription

**Decision**: Extend `AuthService.syncCurrentUser()` to also store `sageline_zone_id` from
the `/api/users/me` response.

**Rationale**: `syncCurrentUser()` (line 307 of `auth.service.ts`) already calls
`GET /api/users/me` and stores `sageline_user_id` and `currentUser` in localStorage.
The `/api/users/me` response is a `User` object. The backend `User` entity has a zone
association (inferred from `ValidationZone` relationships in the domain model). Adding
`localStorage.setItem('sageline_zone_id', user.zoneId?.toString())` in the same `tap()`
operator costs zero additional HTTP calls.

`AppComponent` then reads `localStorage.getItem('sageline_zone_id')` after connect to
wire the `/topic/handover.zone.{zoneId}` subscription for `CHEF_SECTEUR` users.

**New helper method on `AuthService`**:
```typescript
static readonly ZONE_ID_KEY = 'sageline_zone_id';

getCurrentUserZoneId(): number {
  const stored = localStorage.getItem(AuthService.ZONE_ID_KEY);
  return stored ? parseInt(stored, 10) : 0;
}
```

**Alternatives considered**:
- Separate HTTP call to `/api/users/me` in `AppComponent` — extra network round-trip; rejected
- Store zone ID in token claim — requires Keycloak configuration change; rejected

---

## R-004: Sidebar Navigation Architecture

**Decision**: Add "Passations" entry directly to `SidebarComponent.allMenuItems` array.

**Rationale**: `SidebarComponent` (line 13 of `sidebar.component.ts`) defines `allMenuItems`
as a typed array of group objects, each with `label`, `items[]`, where each item has
`label`, `icon`, `route`, and `roles`. The `filteredMenuItems` getter in `ngOnInit()`
already filters by user roles. Adding a new entry follows the exact existing pattern.

**Entry to add** (new group in `allMenuItems`):
```typescript
{
  label: 'PASSATIONS',
  items: [
    {
      label: 'Passations',
      icon: 'pi pi-arrows-h',
      route: '/handovers/queue',
      roles: ['CHEF_SECTEUR', 'ADMIN_IT']
    }
  ]
}
```

The badge counter for pending handovers requires a property not currently in the nav item
schema. Since the existing `sidebar.component.html` does not render badges, the badge is
deferred to a post-integration enhancement. The route and role gate are the critical parts.

**Alternatives considered**:
- Add badge count via a separate `HandoverService` call in `SidebarComponent.ngOnInit()` —
  possible but adds service injection and complexity; defer to post-MVP

---

## R-005: TicketStatus Extension Pattern

**Decision**: Extend `TicketStatus` as a string literal union (not a TypeScript enum).

**Rationale**: `ticket.enum.ts` defines `TicketStatus` as:
```typescript
export type TicketStatus = 'PLANIFIE' | 'EN_ATTENTE_PREP' | ... | 'ANNULE';
```
This is a TypeScript string literal union, not an `enum`. To add `EN_ATTENTE_HANDOVER`,
append it to the union and add its entry to all three companion Record maps:
`TICKET_STATUS_LABELS`, `TICKET_STATUS_COLORS`, `TICKET_STATUS_ICONS`.

**Values to add**:
- Label: `'En Attente Passation'`
- Color: `'warning'` (amber — consistent with the banner severity)
- Icon: `'pi pi-arrows-h'` (same icon as the sidebar entry)

**Alternatives considered**:
- Create a new file for the handover status — would duplicate the `TicketStatus` type; rejected

---

## R-006: AppComponent WebSocket Subscription Pattern

**Decision**: Wire handover subscriptions inside the `syncCurrentUser().subscribe({ next })` 
callback in `AppComponent.ngOnInit()`, after `wsService.connect(userId)`.

**Rationale**: `AppComponent.ngOnInit()` (line 22 of `app.component.ts`) already has the
canonical pattern:
```typescript
this.authService.syncCurrentUser().subscribe({
  next: () => {
    const userId = this.authService.getCurrentUserId();
    this.wsService.connect(userId);
    // ADD HERE: handover subscriptions
  }
});
```
The handover subscriptions must go after `connect()` because `WebSocketService.subscribe()`
retries every 500ms until the STOMP connection is established.

**Personal handover subscription** (all users):
```typescript
this.wsService.subscribe(`/user/${userId}/queue/handover`, (notification) => {
  this.messageService.add({
    severity: 'warn',
    summary: 'Passation',
    detail: notification.message,
    life: 8000
  });
});
```

**Zone subscription** (CHEF_SECTEUR only):
```typescript
if (this.authService.getRoles().includes('CHEF_SECTEUR')) {
  const zoneId = this.authService.getCurrentUserZoneId();
  if (zoneId > 0) {
    this.wsService.subscribe(`/topic/handover.zone.${zoneId}`, () => {
      // HandoverQueuePanelComponent listens to this via a shared Subject
      // or reloads its data by subscribing to the same topic directly
    });
  }
}
```

Note: `HandoverQueuePanelComponent` itself subscribes to the zone topic in its own
`ngOnInit()` (and unsubscribes in `ngOnDestroy()`) because the panel is the only
consumer. No need for `AppComponent` to proxy the zone events.

---

## R-007: PrimeNG Components Required

The following PrimeNG modules must be present in `primeng.module.ts` before component
development begins. Verify each exists; add if missing:

| Component | Module | Used by |
|---|---|---|
| `p-dialog` | `DialogModule` | HandoverInitiateDialog |
| `p-inputTextarea` | `InputTextareaModule` | HandoverInitiateDialog |
| `p-message` | `MessagesModule` or `MessageModule` | HandoverBanner, empty states |
| `p-table` | `TableModule` | HandoverQueuePanel |
| `p-dropdown` | `DropdownModule` | HandoverBanner (assign), HandoverQueuePanel |
| `p-timeline` | `TimelineModule` | HandoverTimeline |
| `p-skeleton` | `SkeletonModule` | HandoverQueuePanel, HandoverAcceptPanel |
| `p-card` | `CardModule` | HandoverAcceptPanel |
| `p-tag` | `TagModule` | HandoverTimeline (trigger type badge) |
| `p-button` | `ButtonModule` | All components |
| `p-toast` | `ToastModule` | AppComponent (already present) |
| `p-confirmDialog` | `ConfirmDialogModule` | HandoverQueuePanel (cancel confirm) |
