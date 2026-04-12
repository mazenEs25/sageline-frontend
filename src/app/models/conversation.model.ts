import { ConversationType } from "../shared/enums/messaging-enums";

export interface Conversation {
  id: number;
  participantOneId: number;
  participantOneUsername: string;
  participantOneRole: string;
  participantTwoId: number;
  participantTwoUsername: string;
  participantTwoRole: string;
  type: ConversationType;
  referenceId?: number;
  referenceType?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageContent?: string;
  lastMessageAt?: string;
  lastMessageSender?: string;
  unreadCount: number;
}