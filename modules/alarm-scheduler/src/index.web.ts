import type { AlarmSchedule } from './index';

export function scheduleAlarm(_alarm: AlarmSchedule): Promise<void> {
  return Promise.reject(new Error('Real alarms are available on Android only.'));
}

export async function cancelAlarm(_alarmId: string) {}
export async function dismissAlarm(_alarmId: string) {}
export async function snoozeAlarm(_alarmId: string, _minutes = 9) {}
export async function canScheduleExactAlarms() { return false; }
export async function openExactAlarmSettings() {}
export async function canUseFullScreenIntent() { return false; }
export async function openFullScreenIntentSettings() {}
export async function areNotificationsEnabled() { return false; }
export async function isIgnoringBatteryOptimizations() { return false; }
export async function openBatteryOptimizationSettings() {}