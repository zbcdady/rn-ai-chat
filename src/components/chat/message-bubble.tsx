import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { UIMessage } from '@tanstack/ai-react';
import { MarkdownMessage } from './markdown-message';
import { ToolCall } from './tool-call';
import { ThinkingBlock } from './thinking-block';
import { CopyButton } from './copy-button';
import { messageText } from './chat-model';
import { ChatIcon } from '@/components/ui/chat-icon';
import { GlassIconButton } from '@/components/ui/glass-icon-button';

type Props = {
  message: UIMessage; generating: boolean; busy: boolean;
  onEdit: (message: UIMessage) => void;
  onRegenerate: (id: string) => void; onExplore: () => void;
};
export const MessageBubble = memo(function MessageBubble({ message, generating, busy, onEdit, onRegenerate, onExplore }: Props) {
  if (message.role !== 'user' && message.role !== 'assistant') return null;
  const thinking = message.parts.filter((part) => part.type === 'thinking').map((part) => part.content).join('\n');
  const hasDisplay = message.parts.some((part) => part.type === 'tool-call' || (part.type === 'text' && part.content.length > 0)) || !!thinking;
  if (!hasDisplay) return null;
  const isUser = message.role === 'user';
  const text = messageText(message);
  return <View style={[styles.row, isUser && styles.userRow]}>
    {!isUser ? <View style={styles.identity}><View style={styles.avatar}><ChatIcon name="sparkles" size={17} color="#4D6BFE" /></View><Text style={styles.label}>AI 助手</Text></View> : null}
    <View style={[styles.content, isUser && styles.userBubble]}>
      {thinking ? <ThinkingBlock onExplore={onExplore} content={thinking} generating={generating && !text} /> : null}
      {message.parts.map((part, index) => part.type === 'text' ? (
        isUser ? <Text key={index} selectable style={styles.userText}>{part.content}</Text> : <MarkdownMessage key={index} content={part.content} />
      ) : part.type === 'tool-call' ? <ToolCall key={part.id} call={part} generating={generating}
        result={message.parts.find((p): p is Extract<UIMessage['parts'][number], { type: 'tool-result' }> => p.type === 'tool-result' && p.toolCallId === part.id)} /> : null)}
    </View>
    {text && !generating ? <View style={[styles.actions, isUser && styles.userActions]}>
      <CopyButton text={text} label={isUser ? '复制问题' : '复制回复'} />
      <GlassIconButton icon={isUser ? 'edit' : 'retry'} label={isUser ? `编辑问题：${text.slice(0, 30)}` : '重新生成回复'}
        disabled={busy} tone="subtle" iconSize={17}
        onPress={() => isUser ? onEdit(message) : onRegenerate(message.id)} />
    </View> : null}
  </View>;
});
const styles = StyleSheet.create({
  row: { alignItems: 'flex-start', marginBottom: 26, width: '100%' },
  userRow: { alignItems: 'flex-end' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  avatar: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#E8EDFE', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#68758C', fontSize: 12, fontWeight: '500' },
  content: { width: '100%', minWidth: 30 },
  userBubble: { width: 'auto', maxWidth: '88%', backgroundColor: '#EFF0F2', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderTopRightRadius: 5 },
  userText: { fontSize: 16, lineHeight: 26, color: '#27292F', flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 4, alignItems: 'center', marginLeft: -8, marginTop: 2 },
  userActions: { marginLeft: 0, marginRight: -8 },
});
