import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChatClient, fetchHttpStream } from '@tanstack/ai-react';
import { parseChatBody } from '../server/request.mts';

test('server accepts the actual current SDK wire format, including restored tool history', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (_input, init) => {
    const body = await parseChatBody(JSON.parse(String(init?.body)));
    assert.ok(body.messages.some((m) => m.role === 'tool'));
    assert.ok(body.messages.some((m) => m.role === 'user'));
    requests++;
    // Transport fixture only: no provider requests or product demo data.
    return new Response([
      { type: 'RUN_STARTED', threadId: body.threadId, runId: body.runId },
      { type: 'RUN_FINISHED', threadId: body.threadId, runId: body.runId },
    ].map((event) => JSON.stringify(event)).join('\n') + '\n', {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  };
  const client = new ChatClient({
    threadId: 'protocol-regression',
    connection: fetchHttpStream('http://protocol.test/chat/http'),
    initialMessages: [
      { id: 'u1', role: 'user', parts: [{ type: 'text', content: '查询 UTC 时间' }] },
      { id: 'a1', role: 'assistant', parts: [
        { type: 'tool-call', id: 't1', name: 'get_current_time', arguments: '{"timeZone":"UTC"}', state: 'complete' },
        { type: 'tool-result', toolCallId: 't1', content: '{"timeZone":"UTC"}', state: 'complete' },
      ] },
    ],
  });
  try {
    await client.sendMessage('继续');
    assert.equal(client.getSnapshot().error, undefined);
    assert.equal(requests, 1);
  } finally {
    client.stop();
    globalThis.fetch = original;
  }
});

