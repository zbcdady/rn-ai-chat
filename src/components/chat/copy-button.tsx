import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { GlassIconButton } from '@/components/ui/glass-icon-button';

export function CopyButton({ text, label = '复制', dark = false }: { text: string; label?: string; dark?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await Clipboard.setStringAsync(text);
      setState('copied');
      AccessibilityInfo.announceForAccessibility('已复制');
    } catch {
      setState('error');
      AccessibilityInfo.announceForAccessibility('复制失败，请重试');
    }
    timer.current = setTimeout(() => setState('idle'), 3000);
  }
  return <GlassIconButton icon={state === 'copied' ? 'check' : state === 'error' ? 'error' : 'copy'}
    label={state === 'copied' ? '已复制' : state === 'error' ? '复制失败，请重试' : label}
    onPress={() => void copy()} tone={dark ? 'code' : 'subtle'} iconSize={17} />;
}
