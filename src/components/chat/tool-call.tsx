import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { UIMessage } from '@tanstack/ai-react';
import { ChatIcon } from '@/components/ui/chat-icon';

type Part = UIMessage['parts'][number];
function timeResult(output: unknown) {
  try {
    const value = typeof output === 'string' ? JSON.parse(output) : output;
    if (value && typeof value === 'object' && typeof value.localTime === 'string') {
      return { time: value.localTime as string, zone: typeof value.timeZone === 'string' ? value.timeZone as string : '' };
    }
  } catch { /* A malformed result stays a completion label, never crashes the transcript. */ }
  return null;
}
export function ToolCall({ call, result, generating }: {
  call: Extract<Part, { type: 'tool-call' }>;
  result?: Extract<Part, { type: 'tool-result' }>;
  generating: boolean;
}) {
  const failed = call.state === 'error' || result?.state === 'error';
  const done = !failed && (result?.state === 'complete' || call.state === 'complete');
  const pending = !done && !failed && generating;
  const label = failed ? '查询失败' : done ? '查询完成' : pending ? '正在查询' : '查询已中断';
  const output = timeResult(result?.content ?? call.output);
  return <View style={styles.card}>
    <View style={styles.row}>
      {pending ? <ActivityIndicator size="small" color="#4D66D7" /> : <ChatIcon name={done ? 'check' : failed ? 'error' : 'clock'} size={16} color="#6B7280" />}
      <Text style={styles.title}>{call.name === 'get_current_time' ? '当前时间' : '工具调用'} · {label}</Text>
    </View>
    {done && output ? <View style={styles.result}><Text selectable style={styles.time}>{output.time}</Text><Text style={styles.zone}>{output.zone}</Text></View> : null}
    {failed ? <Text style={styles.zone}>可以重新生成回复，再试一次。</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 13, marginVertical: 8, backgroundColor: '#F7F8FA', borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#ECEDEF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#536B9B', fontSize: 13, fontWeight: '500', flexShrink: 1 },
  result: { paddingLeft: 22, gap: 4 },
  time: { color: '#293D60', fontSize: 15, lineHeight: 23 },
  zone: { color: '#7B89A2', fontSize: 12, lineHeight: 18 },
});
