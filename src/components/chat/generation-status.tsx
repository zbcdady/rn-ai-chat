import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { GenerationPhase } from './chat-model';

const labels: Record<GenerationPhase, string> = {
  waiting: '正在连接，稍等一下', thinking: '正在思考', tool: '正在查询工具', answering: '正在回答',
};
export function GenerationStatus({ phase }: { phase: GenerationPhase }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return <View style={styles.container} accessibilityLiveRegion="polite">
    <View style={styles.row}><ActivityIndicator size="small" color="#4D66D7" />
      <Text style={styles.label}>{labels[phase]}{seconds >= 3 ? ` · ${seconds} 秒` : ''}</Text>
    </View>
    {seconds >= 15 && phase !== 'answering' ? <Text style={styles.hint}>这次思考稍久，你可以随时停止。</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingTop: 12, paddingBottom: 8, gap: 6 },
  row: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  label: { color: '#66738A', fontSize: 13 },
  hint: { color: '#8390A3', fontSize: 12, paddingLeft: 28 },
});
