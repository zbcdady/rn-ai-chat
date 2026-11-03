import * as SQLite from 'expo-sqlite';
import { createConversationStore, SCHEMA_SQL } from './conversation-store';
export type { Conversation, ConversationSummary } from './conversation-store';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
function getDatabase() {
  database ??= (async () => {
    const db = await SQLite.openDatabaseAsync('ai-chat.db');
    await db.execAsync(SCHEMA_SQL);
    return db;
  })().catch((error) => { database = undefined; throw error; });
  return database;
}

export const { listConversations, createConversation, loadConversation, saveConversation, deleteConversation } = createConversationStore(getDatabase);
