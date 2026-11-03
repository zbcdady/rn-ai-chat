import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server/app.mts';
import { getCurrentTime } from '../server/tools.mts';

test('health and invalid JSON/body reject before model requests', async () => {
  const health = await app.request('/health');
  assert.deepEqual(await health.json(), { ok: true });
  const original = process.env.OPENAI_API_KEY;
  try {
    process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
    for (const body of ['{', JSON.stringify({ messages: [] }), JSON.stringify({ threadId: 'a', messages: [{ id: 'a', role: 'system', parts: [] }] })]) {
      const result = await app.request('/chat/http', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      assert.equal(result.status, 400);
    }
    delete process.env.OPENAI_API_KEY;
    const result = await app.request('/chat/http', { method: 'POST', body: '{}' });
    assert.equal(result.status, 503);
    assert.equal(JSON.stringify(await result.json()).includes('test-only'), false);
  } finally {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
  }
});

test('time tool returns actual instant and requested timezone; invalid zone fails', () => {
  const before = Date.now();
  const result = getCurrentTime('Asia/Shanghai');
  assert.equal(result.timeZone, 'Asia/Shanghai');
  assert.ok(Date.parse(result.iso) >= before && Date.parse(result.iso) <= Date.now());
  assert.ok(result.localTime.length > 10);
  assert.throws(() => getCurrentTime('invalid/timezone'), RangeError);
});
