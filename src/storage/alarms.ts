import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Alarm } from '@/state/alarm';

const ALARMS_KEY = 'dawn-alarm:alarms:v1';

export async function readAlarms(): Promise<Alarm[]> {
  const serialized = await AsyncStorage.getItem(ALARMS_KEY);
  if (!serialized) return [];

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAlarm);
  } catch {
    return [];
  }
}

export async function writeAlarms(alarms: Alarm[]) {
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
}

function isAlarm(value: unknown): value is Alarm {
  if (typeof value !== 'object' || value === null) return false;
  const alarm = value as Partial<Alarm>;
  return (
    typeof alarm.id === 'string' &&
    typeof alarm.time === 'string' &&
    typeof alarm.label === 'string' &&
    typeof alarm.enabled === 'boolean' &&
    Array.isArray(alarm.repeatDays) &&
    alarm.repeatDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}