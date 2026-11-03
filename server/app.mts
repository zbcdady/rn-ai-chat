import { chat, maxIterations, toHttpResponse, type StreamChunk } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { parseChatBody } from './request.mts';
import { currentTimeTool } from './tools.mts';

// Only safe errors cross the public stream boundary; never forward provider raw payloads.
async function* publicStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
  try {
    for await (const chunk of stream) {
      if (chunk.type === 'RUN_ERROR') throw new Error('provider stream failed');
      yield chunk;
    }
  } catch {
    throw new Error('模型请求失败，请检查服务端配置、额度或网络后重试。');
  }
}

export const app = new Hono();
app.onError(() => Response.json({ error: '服务暂时不可用，请稍后重试。' }, { status: 500 }));
app.get('/health', (c) => c.json({ ok: true }));
app.post('/chat/http', bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
  if (!process.env.OPENAI_API_KEY) return c.json({ error: '服务端尚未配置模型凭证。' }, 503);
  let raw: unknown;
  try { raw = await c.req.json(); }
  catch { return c.json({ error: '请求必须是 JSON。' }, 400); }
  let body: Awaited<ReturnType<typeof parseChatBody>>;
  try { body = await parseChatBody(raw); }
  catch { return c.json({ error: '聊天协议格式错误，或会话超过 200 条消息限制。' }, 400); }
  const controller = new AbortController();
  const abort = () => controller.abort();
  c.req.raw.signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 120_000);
  async function* stream() {
    try {
      const source = chat({
        // Gateways may expose model names outside the adapter's OpenAI model catalogue.
        adapter: openaiText((process.env.OPENAI_MODEL ?? 'deepseek-flash') as Parameters<typeof openaiText>[0], { baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.deepseek.com', midConversationChannels: false }),
        messages: body.messages,
        threadId: body.threadId,
        runId: body.runId,
        tools: [currentTimeTool],
        systemPrompts: ['你是一个简洁、可靠的中文助手。使用 Markdown，代码放在带语言名的代码块中。询问当前时间/日期时必须调用 get_current_time，不得猜测；未指定时区时用 Asia/Shanghai。'],
        agentLoopStrategy: maxIterations(4),
        abortController: controller,
      });
      yield* publicStream(source);
    } catch {
      throw new Error('模型请求失败，请检查服务端配置、额度或网络后重试。');
    } finally {
      clearTimeout(timeout);
      controller.abort();
      c.req.raw.signal.removeEventListener('abort', abort);
    }
  }
  return toHttpResponse(stream(), { headers: { 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } });
});
