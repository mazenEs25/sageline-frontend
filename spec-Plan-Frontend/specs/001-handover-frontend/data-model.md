# Data Model: Handover System — Angular Frontend

**Feature**: 001-handover-frontend
**Date**: 2026-05-06

---

## New Files

### `src/app/models/handover.model.ts`

```typescript
export interface HandoverResponse {
  id: number;
  validationId: number;
  ticketCode: string;
  fromTechUsername: string;
  toTechUsername?: string;        // nullable until assigned
  handoverNote: string;
  progressSummary: string;
  status: HandoverStatus;
  triggeredBy: TriggerType;
  scheduledAt: string;            // ISO-8601 datetime string
  acceptedAt?: string;            // nullable until accepted
}

export interface HandoverInitiateRequest {
  handoverNote: string;
  progressSummary: string;
}

export interface HandoverAssignRequest {
  techId: number;
}
```

---

### `src/app/shared/enums/handover-status.enum.ts`

```typescript
export enum HandoverStatus {
  PENDING   = 'PENDING',
  ACCEPTED  = 'ACCEPTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  [HandoverStatus.PENDING]:   'En attente',
  [HandoverStatus.ACCEPTED]:  'Assignée',
  [HandoverStatus.COMPLETED]: 'Terminée',
  [HandoverStatus.CANCELLED]: 'Annulée'
};

export const HANDOVER_STATUS_SEVERITY: Record<HandoverStatus, string> = {
  [HandoverStatus.PENDING]:   'warning',
  [HandoverStatus.ACCEPTED]:  'info',
  [HandoverStatus.COMPLETED]: 'success',
  [HandoverStatus.CANCELLED]: 'danger'
};
```

---

### `src/app/shared/enums/trigger-type.enum.ts`

```typescript
export enum TriggerType {
  MANUAL         = 'MANUAL',
  SHIFT_END_AUTO = 'SHIFT_END_AUTO',
  ADMIN_FORCE    = 'ADMIN_FORCE'
}

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  [TriggerType.MANUAL]:         'Manuelle',
  [TriggerType.SHIFT_END_AUTO]: 'Automatique (fin de shift)',
  [TriggerType.ADMIN_FORCE]:    'Forcée (admin)'
};

export const TRIGGER_TYPE_SEVERITY: Record<TriggerType, string> = {
  [TriggerType.MANUAL]:         'info',
  [TriggerType.SHIFT_END_AUTO]: 'warning',
  [TriggerType.ADMIN_FORCE]:    'danger'
};
```

---

## Modified Files

### `src/app/shared/enums/ticket.enum.ts` — Add `EN_ATTENTE_HANDOVER`

The `TicketStatus` type is a **string literal union** (not an enum). Append:

```typescript
// Before:
export type TicketStatus = 'PLANIFIE' | 'EN_ATTENTE_PREP' | 'PREP_VALIDEE' |
  'EN_COURS' | 'EN_REVUE' | 'CONFORME' | 'NON_CONFORME' | 'ANNULE';

// After:
export type TicketStatus = 'PLANIFIE' | 'EN_ATTENTE_PREP' | 'PREP_VALIDEE' |
  'EN_COURS' | 'EN_REVUE' | 'CONFORME' | 'NON_CONFORME' | 'ANNULE' |
  'EN_ATTENTE_HANDOVER';
```

Add to all three companion records:

```typescript
// TICKET_STATUS_LABELS
EN_ATTENTE_HANDOVER: 'En Attente Passation',

// TICKET_STATUS_COLORS
EN_ATTENTE_HANDOVER: 'warning',

// TICKET_STATUS_ICONS
EN_ATTENTE_HANDOVER: 'pi pi-arrows-h',
```

---

## Component Input/Output Contracts

### `HandoverBannerComponent`
```
@Input()  ticket: Validation          — the current ticket (status checked internally)
@Output() handoverInitiated = new EventEmitter<void>()  — emitted after initiate dialog closes
@Output() handoverAccepted  = new EventEmitter<void>()  — emitted after accept action
```

### `HandoverInitiateDialogComponent`
```
@Input()  validationId: number
@Input()  visible: boolean
@Output() visibleChange = new EventEmitter<boolean>()   — two-way binding support
@Output() initiated     = new EventEmitter<void>()      — emitted on successful submit
```

### `HandoverAcceptPanelComponent` (routed — no @Input)
```
Route param: :id (validationId)
Loads HandoverResponse[] from API on init; uses first PENDING record
```

### `HandoverQueuePanelComponent` (routed — no @Input)
```
Loads pending HandoverResponse[] from API on init
Subscribes to /topic/handover.zone.{zoneId} in ngOnInit, unsubscribes in ngOnDestroy
```

### `HandoverTimelineComponent`
```
@Input() validationId: number
Loads HandoverResponse[] from API on init
Only renders if records.length > 0
```

---

## WebSocket Payload — `HandoverNotificationDto`

Incoming message shape on `/user/{userId}/queue/handover` and
`/topic/handover.zone.{zoneId}`:

```typescript
interface HandoverNotificationDto {
  type: 'HANDOVER_TRIGGERED' | 'HANDOVER_ASSIGNED' | 'HANDOVER_COMPLETED';
  handoverId: number;
  validationId: number;
  ticketCode: string;
  message: string;
  timestamp: string;   // ISO-8601
}
```
