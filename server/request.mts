import { chatParamsFromRequestBody } from '@tanstack/ai';
import { z } from 'zod';

const bodySchema = z.object({
  threadId: z.string().min(1).max(160),
  runId: z.string().min(1).max(160),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'tool', 'reasoning']),
  }).passthrough()).min(1).max(200),
}).passthrough();

export async function parseChatBody(raw: unknown) {
  bodySchema.parse(raw);
  // UI state uses parts; the current client sends AG-UI content/toolCalls on the wire.
  return chatParamsFromRequestBody(raw);
}
