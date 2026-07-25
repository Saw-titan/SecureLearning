import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePreventScreenCapture } from 'expo-screen-capture';

export default function RootLayout() {
  usePreventScreenCapture();
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0E' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
        <Stack.Screen name="(auth)/forgot" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)/upload" />
        <Stack.Screen name="course/[id]" />
      </Stack>
    </>
  );
}
