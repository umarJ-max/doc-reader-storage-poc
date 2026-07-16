import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide the native splash screen (configured in app.json) once the app is ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="merge-pdf" />
        <Stack.Screen name="images-to-pdf" />
        <Stack.Screen name="pdf-to-image" />
        <Stack.Screen name="watermark-pdf" />
        <Stack.Screen name="split-pdf" />
        <Stack.Screen name="notes" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="whatsapp-chat" />
        <Stack.Screen name="settings" />
      </Stack>
    </ThemeProvider>
  );
}