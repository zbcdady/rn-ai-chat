import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { loadConversation, type Conversation } from '@/data/conversations';
import ChatSession from '@/components/chat/chat-session';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void loadConversation(id).then((value) => {
      if (!active) return;
      if (value) { setConversation(value); setError(''); }
      else setError('会话不存在或已删除。');
    }).catch(() => { if (active) setError('恢复会话失败，请重试。'); });
    return () => { active = false; };
  }, [id, revision]);
  if (conversation?.id === id) return <ChatSession key={id} conversation={conversation} />;
  return <View style={styles.center}>{error ? <>
    <Text accessibilityRole="alert">{error}</Text>
    <Button title="重试" onPress={() => setRevision((v) => v + 1)} />
    <Button title="返回会话" onPress={() => router.replace('/')} />
  </> : <ActivityIndicator />}</View>;
}
const styles = StyleSheet.create({ center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 } });
