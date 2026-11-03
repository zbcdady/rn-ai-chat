import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatIcon } from '@/components/ui/chat-icon';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { createConversation, deleteConversation, listConversations, type ConversationSummary } from '@/data/conversations';

type Summary = ConversationSummary;
export default function ConversationsScreen() {
  const [sessions, setSessions] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    void revision;
    void listConversations().then((rows) => {
      if (active) { setSessions(rows); setError(''); }
    }).catch(() => { if (active) setError('读取本地会话失败，请重试。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]));

  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createConversation();
      router.push({ pathname: '/chat/[id]', params: { id } });
    } catch { setError('新建会话失败，请检查设备存储空间。'); }
    finally { setCreating(false); }
  }
  function confirmDelete(id: string) {
    Alert.alert('删除会话？', '这将删除设备上的这段聊天记录。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => {
        void deleteConversation(id).then(() => setRevision((v) => v + 1))
          .catch(() => setError('删除失败，请重试。'));
      } },
    ]);
  }
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <View style={styles.heading}><Text style={styles.eyebrow}>DEEPSEEK · AI CHAT</Text><Text style={styles.title}>对话</Text></View>
      <GlassIconButton icon="newChat" label="新建会话" disabled={creating} onPress={() => void create()} size={48} />
    </View>
    {error ? <Pressable onPress={() => setRevision((v) => v + 1)}><Text accessibilityRole="alert" style={styles.error}>{error} 点击重试</Text></Pressable> : null}
    {loading ? <ActivityIndicator style={styles.loader} /> : <FlatList
      data={sessions} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
      ListEmptyComponent={<View style={styles.empty}><ChatIcon name="chat" size={42} color="#B9BDC7" /><Text style={styles.emptyTitle}>从一个问题开始</Text><Text style={styles.subtitle}>支持 Markdown、代码块与真实时间工具</Text></View>}
      renderItem={({ item }) => <View style={styles.card}>
        <Pressable accessibilityRole="button" style={styles.open} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}>
          <Text numberOfLines={2} style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.subtitle}>{new Date(item.updated_at).toLocaleString()}</Text>
        </Pressable>
        <GlassIconButton icon="trash" label={`删除会话：${item.title}`} onPress={() => confirmDelete(item.id)} tone="subtle" iconSize={17} />
      </View>}
    />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 30, gap: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { gap: 8 }, eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: '600', color: '#8A8D96' }, title: { fontSize: 34, letterSpacing: -1.1, fontWeight: '700', color: '#24262C' },
  subtitle: { color: '#626C7E', fontSize: 13, lineHeight: 21 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, paddingRight: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ECEDEF' },
  open: { flex: 1, padding: 18, gap: 8 },
  sessionTitle: { color: '#292B30', fontSize: 17, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 22, color: '#292B30', fontWeight: '600' },
  error: { padding: 16, color: '#A12335' }, loader: { margin: 24 },
});
