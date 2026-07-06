import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Reminder } from '@/db/types';
import {
  clearReminderNotifications,
  getReminderNotificationIds,
  listReminders,
  setReminderNotifications,
} from '@/db/queries';

const ANDROID_CHANNEL_ID = 'ryft-reminders';

let handlerConfigured = false;

/** Show reminders as banners even when the app is foregrounded. Call once at startup. */
export function configureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 250],
    lightColor: '#FFFFFF',
  });
}

export async function getPermissionStatus(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// Ryft stores weekdays as 0=Sun..6=Sat; expo-notifications wants 1=Sun..7=Sat.
function toExpoWeekday(jsWeekday: number): number {
  return jsWeekday + 1;
}

/** Cancel all OS notifications backing a reminder and forget their ids. */
export async function unscheduleReminder(db: SQLiteDatabase, reminderId: number): Promise<void> {
  const ids = await getReminderNotificationIds(db, reminderId);
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
  await clearReminderNotifications(db, reminderId);
}

/** Schedule one weekly OS notification per selected weekday; store their ids. */
export async function scheduleReminder(db: SQLiteDatabase, reminder: Reminder): Promise<void> {
  await unscheduleReminder(db, reminder.id);
  if (!reminder.enabled || reminder.daysOfWeek.length === 0) return;

  await ensureAndroidChannel();
  const entries: { weekday: number; notificationId: string }[] = [];

  for (const jsWeekday of reminder.daysOfWeek) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ryft',
        body: reminder.message,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(jsWeekday),
        hour: reminder.hour,
        minute: reminder.minute,
      },
    });
    entries.push({ weekday: jsWeekday, notificationId });
  }
  await setReminderNotifications(db, reminder.id, entries);
}

/** Re-sync every stored reminder with the OS scheduler (e.g. after app reinstall/boot). */
export async function rescheduleAllReminders(db: SQLiteDatabase): Promise<void> {
  const granted = await getPermissionStatus();
  if (!granted) return;
  const reminders = await listReminders(db);
  for (const r of reminders) {
    await scheduleReminder(db, r);
  }
}
