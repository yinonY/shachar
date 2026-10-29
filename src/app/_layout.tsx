import { AlarmProvider } from '@/state/alarm-context';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <AlarmProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </AlarmProvider>
  );
}
