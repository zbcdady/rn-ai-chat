import type { UIMessage } from '@tanstack/ai-react';
import type { SessionDetails } from '../components/chat/chat-model';

export interface Conversation extends SessionDetails {
  id: string;
  title: string;
  updated_at: number;
  messages: readonly UIMessage[];
}
export type ConversationSummary = Pick<Conversation, 'id' | 'title' | 'updated_at'>;
type Row = ConversationSummary & { messages_json: string };
export const SCHEMA_SQL = `PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  messages_json TEXT NOT NULL DEFAULT '[]'
);
PRAGMA user_version = 1;`;

export interface ConversationDatabase {
  runAsync(sql: string, ...params: (string | number)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: (string | number)[]): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
}

export function createConversationStore(getDatabase: () => Promise<ConversationDatabase>) {
  async function listConversations() {
    const db = await getDatabase();
    return db.getAllAsync<ConversationSummary>(
      'SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC',
    );
  }

  async function createConversation() {
    const db = await getDatabase();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await db.runAsync('INSERT INTO conversations (id, title, updated_at) VALUES (?, ?, ?)', id, '新对话', Date.now());
    return id;
  }

  async function loadConversation(id: string): Promise<Conversation | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Row>('SELECT * FROM conversations WHERE id = ?', id);
    if (!row) return null;
    const stored: unknown = JSON.parse(row.messages_json);
    const envelope = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored as Record<string, unknown> : null;
    const messages: unknown = envelope ? envelope.messages : stored;
    const draft = typeof envelope?.draft === 'string' ? envelope.draft : '';
    const state = envelope?.generationState;
    const generationState = state === 'stopped' || state === 'interrupted' || state === 'error' ? state : 'idle';
    if (!Array.isArray(messages) || messages.some((m) => !m || typeof m.id !== 'string' || !Array.isArray(m.parts))) {
      throw new Error('会话数据损坏，无法恢复。');
    }
    return { id: row.id, title: row.title, updated_at: row.updated_at, messages, draft, generationState };
  }

  // Serialize writes so a slow earlier write cannot overwrite a newer snapshot.
  let writes: Promise<unknown> = Promise.resolve();
  function saveConversation(id: string, messages: readonly UIMessage[], details: SessionDetails = { draft: '', generationState: 'idle' }) {
    const json = JSON.stringify({ version: 2, messages, draft: details.draft, generationState: details.generationState });
    const firstUser = messages.find((m) => m.role === 'user');
    const title = firstUser?.parts.filter((p) => p.type === 'text').map((p) => p.content).join(' ').trim().slice(0, 48) || '新对话';
    const updatedAt = Date.now();
    const write = writes.catch(() => {}).then(async () => {
      const db = await getDatabase();
      // A remount/fast refresh may briefly expose an empty initial snapshot.
      // Clearing a transcript is done by deleting its conversation, so an empty
      // initialization must never wipe a nonempty durable history.
      if (messages.length === 0) {
        const current = await loadConversation(id);
        if (current?.messages.length) return;
      }
      // UPDATE never resurrects a conversation deleted while a save was pending.
      await db.runAsync('UPDATE conversations SET title = ?, updated_at = ?, messages_json = ? WHERE id = ?', title, updatedAt, json, id);
    });
    writes = write;
    return write;
  }

  async function deleteConversation(id: string) {
    await writes.catch(() => {});
    const db = await getDatabase();
    await db.runAsync('DELETE FROM conversations WHERE id = ?', id);
  }

  return { listConversations, createConversation, loadConversation, saveConversation, deleteConversation };
}
