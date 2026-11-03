import { SymbolView, type SymbolViewProps } from 'expo-symbols';

const symbols = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  send: { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' },
  stop: { ios: 'stop.fill', android: 'stop', web: 'stop' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  error: { ios: 'exclamationmark', android: 'priority_high', web: 'priority_high' },
  edit: { ios: 'square.and.pencil', android: 'edit_square', web: 'edit_square' },
  retry: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  down: { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  chevronUp: { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' },
  keyboard: { ios: 'keyboard.chevron.compact.down', android: 'keyboard_hide', web: 'keyboard_hide' },
  newChat: { ios: 'square.and.pencil', android: 'edit_square', web: 'edit_square' },
  chat: { ios: 'bubble.left', android: 'chat_bubble', web: 'chat_bubble' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
} satisfies Record<string, SymbolViewProps['name']>;
export type ChatIconName = keyof typeof symbols;
export function ChatIcon({ name, size = 20, color = '#292B30' }: { name: ChatIconName; size?: number; color?: string }) {
  return <SymbolView name={symbols[name]} size={size} tintColor={color} weight="medium"
    style={{ width: size, height: size }} pointerEvents="none" accessible={false} />;
}
