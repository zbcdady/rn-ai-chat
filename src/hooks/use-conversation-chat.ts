import { useChat, xhrHttpStream, type UIMessage } from '@tanstack/ai-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { saveConversation, type Conversation } from '@/data/conversations';
import {
  historyBeforeEdit, historyForRegeneration, messageText,
  type SavedGenerationState, type SessionDetails,
} from '@/components/chat/chat-model';

const base = process.env.EXPO_PUBLIC_TANSTACK_AI_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://127.0.0.1:8787');
const connection = xhrHttpStream(`${base.replace(/\/$/, '')}/chat/http`);
type Snapshot = SessionDetails & { messages: readonly UIMessage[] };

export function useConversationChat(conversation: Conversation) {
  const [input, setInput] = useState(conversation.draft);
  const [editingId, setEditingId] = useState<string>();
  const draftBeforeEdit = useRef('');
  const [ending, setEnding] = useState<SavedGenerationState>(conversation.generationState);
  const [localError, setLocalError] = useState('');
  const [storageError, setStorageError] = useState('');
  const guard = useRef(false);
  const { messages, sendMessage, isLoading, error, stop, reload, setMessages } = useChat({
    connection, threadId: conversation.id, initialMessages: [...conversation.messages],
  });
  const latest = useRef<Snapshot>({ messages, draft: input, generationState: ending });
  const saved = useRef<Snapshot | undefined>(undefined);
  const persist = useCallback(async (snapshot: Snapshot) => {
    try {
      await saveConversation(conversation.id, snapshot.messages, snapshot);
      saved.current = snapshot;
      setStorageError('');
      return true;
    } catch {
      setStorageError('暂时无法保存到本机，请检查存储空间。');
      return false;
    }
  }, [conversation.id]);

  useEffect(() => {
    const previous = latest.current;
    const generationState = isLoading ? 'interrupted' : error || localError ? 'error' : ending;
    const snapshot: Snapshot = { messages, draft: input, generationState };
    latest.current = snapshot;
    // Idle drafts are checkpointed; settled responses are flushed immediately.
    if (!isLoading && (previous.messages !== messages || previous.generationState !== generationState)) void persist(snapshot);
  }, [messages, input, isLoading, ending, error, localError, persist]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (saved.current !== latest.current) void persist(latest.current);
    }, 500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && latest.current.generationState === 'interrupted') {
        // iOS may suspend JS/network: finish locally and keep a clear retry path.
        stop();
        setEnding('interrupted');
      }
      if (state !== 'active') void persist(latest.current);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
      stop();
      void saveConversation(conversation.id, latest.current.messages, latest.current).catch(() => {});
    };
  }, [conversation.id, persist, stop]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      stop();
      setLocalError('这次连接超时了，已保留收到的内容。请重试。');
    }, 125_000);
    return () => clearTimeout(timer);
  }, [isLoading, stop]);

  const beginEdit = useCallback((message: UIMessage) => {
    if (guard.current) return;
    draftBeforeEdit.current = latest.current.draft;
    setInput(messageText(message));
    setEditingId(message.id);
  }, []);
  const cancelEdit = useCallback(() => {
    setEditingId(undefined);
    setInput(draftBeforeEdit.current);
  }, []);
  const stopGeneration = useCallback(() => {
    setEnding('stopped');
    stop();
    const snapshot = { ...latest.current, generationState: 'stopped' as const };
    latest.current = snapshot;
    void persist(snapshot);
  }, [persist, stop]);

  async function send() {
    const text = input.trim();
    if (!text || isLoading || guard.current) return false;
    guard.current = true;
    setLocalError('');
    setEnding('idle');
    if (editingId) setMessages(historyBeforeEdit(latest.current.messages, editingId));
    setEditingId(undefined);
    setInput('');
    try { await sendMessage(text); return true; }
    catch { setLocalError('发送失败，问题已保留，你可以重试。'); return false; }
    finally { guard.current = false; }
  }
  const regenerate = useCallback(async (id?: string) => {
    if (guard.current) return;
    guard.current = true;
    setLocalError('');
    setEnding('idle');
    try {
      if (id) setMessages(historyForRegeneration(latest.current.messages, id));
      await reload();
    } catch { setLocalError('重新生成失败，请稍后再试。'); }
    finally { guard.current = false; }
  }, [reload, setMessages]);
  async function leave() {
    if (isLoading) {
      stop();
      latest.current = { ...latest.current, generationState: 'interrupted' };
    }
    return persist(latest.current);
  }
  return {
    messages, input, setInput, editingId, beginEdit, cancelEdit, send, regenerate,
    stopGeneration, leave, isLoading, error, localError, storageError, ending,
    retrySave: () => persist(latest.current),
  };
}
