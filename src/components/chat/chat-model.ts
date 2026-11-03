import type { UIMessage } from '@tanstack/ai-react';

export type GenerationPhase = 'waiting' | 'thinking' | 'tool' | 'answering';
export type SavedGenerationState = 'idle' | 'stopped' | 'interrupted' | 'error';
export interface SessionDetails { draft: string; generationState: SavedGenerationState }

export function messageText(message: UIMessage) {
  return message.parts.filter((part) => part.type === 'text').map((part) => part.content).join('\n');
}

export function generationPhase(messages: readonly UIMessage[]): GenerationPhase {
  const lastUser = messages.findLastIndex((message) => message.role === 'user');
  const parts = messages.slice(lastUser + 1).flatMap((message) => message.parts);
  if (parts.some((part) => part.type === 'text' && part.content.trim())) return 'answering';
  if (parts.some((part) => part.type === 'tool-call')) return 'tool';
  if (parts.some((part) => part.type === 'thinking')) return 'thinking';
  return 'waiting';
}

// Editing removes this question and its dependent turns; regenerate keeps the question.
export function historyBeforeEdit(messages: readonly UIMessage[], id: string) {
  const index = messages.findIndex((message) => message.id === id && message.role === 'user');
  if (index < 0) throw new Error('待编辑的消息不存在。');
  return messages.slice(0, index);
}
export function historyForRegeneration(messages: readonly UIMessage[], id: string) {
  const index = messages.findIndex((message) => message.id === id && message.role === 'assistant');
  if (index < 0) throw new Error('待重新生成的回复不存在。');
  const userIndex = messages.slice(0, index).findLastIndex((message) => message.role === 'user');
  if (userIndex < 0) throw new Error('未找到对应的问题。');
  return messages.slice(0, userIndex + 1);
}

export function readableError(error?: Error) {
  const message = error?.message ?? '';
  if (/401|403/.test(message)) return '模型服务认证失败，请检查服务端凭证。';
  if (/429/.test(message)) return '请求较多或额度不足，请稍后重试。';
  if (/400|413/.test(message)) return '这段会话过长或请求格式不受支持，请新建会话再试。';
  return '连接中断或服务暂时不可用，已收到的内容会保留。';
}
