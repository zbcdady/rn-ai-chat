import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ChatIcon, type ChatIconName } from './chat-icon';

const nativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
const GlassContext = createContext(nativeGlass);
export function GlassProvider({ children }: { children: ReactNode }) {
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => { if (active) setReduceTransparency(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <GlassContext.Provider value={nativeGlass && !reduceTransparency}>{children}</GlassContext.Provider>;
}
export function GlassSurface({ children, style, interactive = false, dark = false }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; interactive?: boolean; dark?: boolean;
}) {
  const glass = useContext(GlassContext);
  if (glass) return <GlassView glassEffectStyle="regular" colorScheme={dark ? 'dark' : 'light'} isInteractive={interactive}
    style={style}>{children}</GlassView>;
  return <View style={[{ backgroundColor: dark ? '#292C34' : '#F0F1F3', borderWidth: StyleSheet.hairlineWidth, borderColor: dark ? '#454953' : '#DCDDE1' }, style]}>{children}</View>;
}
export function GlassIconButton({ icon, label, onPress, disabled = false, size = 44, iconSize = 20, tone = 'default', style, hint }: {
  icon: ChatIconName; label: string; onPress: () => void; disabled?: boolean; size?: number; iconSize?: number;
  tone?: 'default' | 'primary' | 'subtle' | 'danger' | 'code'; style?: StyleProp<ViewStyle>; hint?: string;
}) {
  const dark = tone === 'primary' || tone === 'code';
  const color = disabled ? '#AEB0B7' : tone === 'danger' ? '#A45252' : dark ? '#F9FAFB' : tone === 'subtle' ? '#747780' : '#292B30';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.target, { width: size, height: size }, pressed && styles.pressed, style]}>
    <GlassSurface dark={dark} interactive style={[styles.surface, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }, dark && styles.dark]}>
      <ChatIcon name={icon} size={iconSize} color={color} />
    </GlassSurface>
  </Pressable>;
}
const styles = StyleSheet.create({
  target: { alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  surface: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  dark: { backgroundColor: '#24262C' },
  pressed: { transform: [{ scale: 0.94 }] },
});
