import { MessageType } from "../shared/enums/messaging-enums";

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  senderRole: string;
  content: string;
  messageType: MessageType;
  sentAt: string;
  readAt?: string;
  systemMessage: boolean;
}

export interface MessageRequest {
  conversationId: number;
  senderId: number;
  content: string;
}

export interface WebSocketMessage {
  type: string;
  payload?: any;
  senderId?: number;
  recipientId?: number;
  conversationId?: number;
  timestamp?: string;
}