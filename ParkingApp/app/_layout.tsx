import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';


import { useFonts } from 'expo-font';
import { Ionicons, MaterialIcons, FontAwesome, FontAwesome5, Entypo, MaterialCommunityIcons } from '@expo/vector-icons';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  //  LOAD ICON FONTS
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...FontAwesome.font,
    ...FontAwesome5.font,
    ...Entypo.font,
    ...MaterialCommunityIcons.font,
  });

  //  Prevent render until fonts loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade", 
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}