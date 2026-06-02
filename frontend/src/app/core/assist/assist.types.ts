export interface AssistChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistSource {
  slug: string;
  title: string;
}

export interface AssistChatResponse {
  reply: string;
  sources: AssistSource[];
}

export interface AssistStatusResponse {
  configured: boolean;
}
