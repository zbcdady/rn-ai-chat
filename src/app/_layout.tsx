import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GlassProvider } from '@/components/ui/glass-icon-button';

export default function RootLayout() {
  return <GlassProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAFAFA' } }} />
  </GlassProvider>;
}
