export interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
}
export interface ChatMessage {
  sender: 'user' | 'ai' | 'operator';
  message: string;
  timestamp: Date;
}

export interface SupportTicket {
  id?: string;
  userId: string;
  issueType: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}

export interface CSAT {
  rating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  feedback?: string;
}
