import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  IBMPlexSerif_400Regular,
  IBMPlexSerif_500Medium,
  IBMPlexSerif_400Regular_Italic,
} from '@expo-google-fonts/ibm-plex-serif';

import { DATABASE_NAME, migrateDatabase } from '@/db/database';
import { ThemeProvider, useTheme } from '@/theme';
import { configureNotificationHandler, rescheduleAllReminders } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

/** Runs once the DB + theme are ready: hides splash, re-syncs reminders with the OS. */
function AppBootstrap() {
  const db = useSQLiteContext();
  useEffect(() => {
    rescheduleAllReminders(db).catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
  }, [db]);
  return null;
}

function RootNav() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'none', gestureEnabled: false }} />
        <Stack.Screen name="day/[date]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="prime" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reminders" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
    IBMPlexSerif_400Regular,
    IBMPlexSerif_500Medium,
    IBMPlexSerif_400Regular_Italic,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppBootstrap />
          <RootNav />
        </SafeAreaProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
