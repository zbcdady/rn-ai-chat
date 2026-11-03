import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChatIcon } from '@/components/ui/chat-icon';

export function ThinkingBlock({ content, generating, onExplore }: { content: string; generating: boolean; onExplore: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityLabel={expanded ? '收起思考过程' : '展开思考过程'}
      accessibilityState={{ expanded }} onPress={() => { if (!expanded) onExplore(); setExpanded((value) => !value); }} style={styles.trigger}>
      <View style={styles.labelRow}><Text style={styles.label}>{generating ? '正在思考' : '思考过程'}</Text><ChatIcon name={expanded ? 'chevronUp' : 'chevronDown'} size={12} color="#7B7E86" /></View>
      {!expanded && content ? <Text numberOfLines={1} style={styles.preview}>{content.trim().slice(-100)}</Text> : null}
    </Pressable>
    {expanded ? <Text selectable style={styles.content}>{content || '正在整理思路…'}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { borderLeftWidth: 2, borderLeftColor: '#DCE2EF', paddingLeft: 12, marginVertical: 6 },
  trigger: { minHeight: 42, justifyContent: 'center', gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { fontSize: 13, fontWeight: '500', color: '#637089' },
  preview: { fontSize: 12, lineHeight: 18, color: '#8792A4' },
  content: { color: '#78849A', fontSize: 14, lineHeight: 23, paddingVertical: 8 },
});
