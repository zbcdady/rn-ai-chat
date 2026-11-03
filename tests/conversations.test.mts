import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createConversationStore, SCHEMA_SQL, type ConversationDatabase } from '../src/data/conversation-store.ts';
import type { UIMessage } from '@tanstack/ai-react';

function openStore() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(SCHEMA_SQL);
  // Execute the production SQL against real SQLite, with the same async interface.
  const db: ConversationDatabase = {
    async runAsync(sql, ...params) { return sqlite.prepare(sql).run(...params); },
    async getFirstAsync<T>(sql: string, ...params: (string | number)[]) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string) { return sqlite.prepare(sql).all() as T[]; },
  };
  return { sqlite, store: createConversationStore(async () => db) };
}
const message = (content: string): UIMessage[] => [{ id: 'u1', role: 'user', parts: [{ type: 'text', content }] }];

test('SQLite persists Unicode, quotes and tool parts without interpolating user input', async () => {
  const { sqlite, store } = openStore();
  try {
    const id = await store.createConversation();
    const messages: UIMessage[] = [...message("你好 '); DROP TABLE conversations; --"), {
      id: 'a1', role: 'assistant', parts: [
        { type: 'tool-call', id: 't1', name: 'get_current_time', arguments: '{"timeZone":"UTC"}', state: 'complete' },
        { type: 'tool-result', toolCallId: 't1', content: '{"timeZone":"UTC"}', state: 'complete' },
      ],
    }];
    await store.saveConversation(id, messages);
    assert.deepEqual((await store.loadConversation(id))?.messages, messages);
    assert.equal((await store.listConversations()).length, 1);
    assert.equal((await store.listConversations())[0]?.title, messages[0]?.parts[0]?.type === 'text' ? messages[0].parts[0].content : '');
  } finally { sqlite.close(); }
});

test('SQLite ordered saves retain the latest snapshot and deletion cannot resurrect', async () => {
  const { sqlite, store } = openStore();
  try {
    const id = await store.createConversation();
    await Promise.all([store.saveConversation(id, message('first')), store.saveConversation(id, message('latest'))]);
    assert.deepEqual((await store.loadConversation(id))?.messages, message('latest'));
    await store.deleteConversation(id);
    await store.saveConversation(id, message('late write'));
    assert.equal(await store.loadConversation(id), null);
    assert.deepEqual(await store.listConversations(), []);
  } finally { sqlite.close(); }
});

test('SQLite restores draft and interrupted state, and reads legacy message arrays', async () => {
  const { sqlite, store } = openStore();
  try {
    const id = await store.createConversation();
    await store.saveConversation(id, message('question'), { draft: '未发送的草稿', generationState: 'interrupted' });
    const restored = await store.loadConversation(id);
    assert.equal(restored?.draft, '未发送的草稿');
    assert.equal(restored?.generationState, 'interrupted');
    sqlite.prepare('UPDATE conversations SET messages_json = ? WHERE id = ?').run(JSON.stringify(message('legacy')),id);
    assert.deepEqual((await store.loadConversation(id))?.messages,message('legacy'));
    assert.equal((await store.loadConversation(id))?.draft,'');
  } finally { sqlite.close(); }
});

test('an empty initialization snapshot cannot wipe a durable transcript', async () => {
  const { sqlite, store } = openStore();
  try {
    const id = await store.createConversation();
    await store.saveConversation(id, message('durable'), {draft:'draft',generationState:'interrupted'});
    await store.saveConversation(id, []);
    assert.deepEqual((await store.loadConversation(id))?.messages, message('durable'));
    assert.equal((await store.loadConversation(id))?.draft,'draft');
  } finally { sqlite.close(); }
});
