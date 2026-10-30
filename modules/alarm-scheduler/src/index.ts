import { NativeModule, requireNativeModule } from 'expo';

type AlarmSchedulerEvents = Record<string, never>;

declare class AlarmSchedulerModule extends NativeModule<AlarmSchedulerEvents> {
  scheduleAlarm(
    alarmId: string,
    wakeAtMillis: number,
    sunriseMinutes: number,
    ringDelayMinutes: number,
    label: string,
  ): Promise<void>;
  cancelAlarm(alarmId: string): Promise<void>;
  dismissAlarm(alarmId: string): Promise<void>;
  snoozeAlarm(alarmId: string, snoozeMinutes: number): Promise<void>;
  canScheduleExactAlarms(): Promise<boolean>;
  openExactAlarmSettings(): Promise<void>;
  canUseFullScreenIntent(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<void>;
  areNotificationsEnabled(): Promise<boolean>;
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  openBatteryOptimizationSettings(): Promise<void>;
}

const AlarmScheduler = requireNativeModule<AlarmSchedulerModule>('AlarmScheduler');

export type AlarmSchedule = {
  id: string;
  wakeAtMillis: number;
  sunriseMinutes: number;
  ringDelayMinutes: number;
  label?: string;
};

export function scheduleAlarm(alarm: AlarmSchedule) {
  return AlarmScheduler.scheduleAlarm(
    alarm.id,
    alarm.wakeAtMillis,
    alarm.sunriseMinutes,
    alarm.ringDelayMinutes,
    alarm.label ?? '',
  );
}

export function cancelAlarm(alarmId: string) {
  return AlarmScheduler.cancelAlarm(alarmId);
}

export function dismissAlarm(alarmId: string) {
  return AlarmScheduler.dismissAlarm(alarmId);
}

export function snoozeAlarm(alarmId: string, minutes = 9) {
  return AlarmScheduler.snoozeAlarm(alarmId, minutes);
}

export function canScheduleExactAlarms() {
  return AlarmScheduler.canScheduleExactAlarms();
}

export function openExactAlarmSettings() {
  return AlarmScheduler.openExactAlarmSettings();
}

export function canUseFullScreenIntent() {
  return AlarmScheduler.canUseFullScreenIntent();
}

export function openFullScreenIntentSettings() {
  return AlarmScheduler.openFullScreenIntentSettings();
}

export function areNotificationsEnabled() {
  return AlarmScheduler.areNotificationsEnabled();
}

export function isIgnoringBatteryOptimizations() {
  return AlarmScheduler.isIgnoringBatteryOptimizations();
}

export function openBatteryOptimizationSettings() {
  return AlarmScheduler.openBatteryOptimizationSettings();
}