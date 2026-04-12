import { NotificationType } from "../shared/enums/messaging-enums";

export interface AppNotification {
  id: number;
  title: string;
  content: string;
  notificationType: NotificationType;
  referenceId?: number;
  referenceType?: string;
  read: boolean;
  createdAt: string;
}

export interface UnreadCount {
  count: number;
}