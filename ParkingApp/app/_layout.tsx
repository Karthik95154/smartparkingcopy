import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade", 
        }}
      >
        {/* ENTRY SCREEN (WELCOME) */}
        <Stack.Screen name="index" />

        {/*  AUTH */}
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />

        {/* MAIN APP */}
        <Stack.Screen name="(tabs)" />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}