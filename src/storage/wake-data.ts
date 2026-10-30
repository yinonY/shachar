import AsyncStorage from '@react-native-async-storage/async-storage';

export type WakeAlarm = {
  id: string;
  label: string;
  wakeAtMillis: number;
};

export type WakePreferences = {
  sunriseMinutes: number;
  birdsongMinutes: number;
  ambienceMinutes: number;
  ringDelayMinutes: number;
  sound: 'birds' | 'rain' | 'tone';
  language: 'en' | 'he';
};

export const DEFAULT_PREFERENCES: WakePreferences = {
  sunriseMinutes: 30,
  birdsongMinutes: 15,
  ambienceMinutes: 5,
  ringDelayMinutes: 5,
  sound: 'birds',
  language: 'en',
};

const ALARMS_KEY = 'dawn.alarms.v1';
const PREFERENCES_KEY = 'dawn.preferences.v1';

export async function getWakeAlarms(): Promise<WakeAlarm[]> {
  const raw = await AsyncStorage.getItem(ALARMS_KEY);
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((alarm): alarm is WakeAlarm =>
      typeof alarm?.id === 'string' &&
      typeof alarm?.label === 'string' &&
      typeof alarm?.wakeAtMillis === 'number' &&
      Number.isFinite(alarm.wakeAtMillis),
    );
  } catch {
    return [];
  }
}

export async function saveWakeAlarms(alarms: WakeAlarm[]) {
  await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
}

export async function getWakePreferences(): Promise<WakePreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<WakePreferences>;
    return {
      sunriseMinutes: bounded(value.sunriseMinutes, 30, 0, 180),
      birdsongMinutes: bounded(value.birdsongMinutes, 15, 0, 180),
      ambienceMinutes: bounded(value.ambienceMinutes, 5, 0, 180),
      ringDelayMinutes: bounded(value.ringDelayMinutes, 5, 0, 120),
      sound: value.sound === 'rain' || value.sound === 'tone' ? value.sound : 'birds',
      language: value.language === 'he' ? 'he' : 'en',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function saveWakePreferences(preferences: WakePreferences) {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

function bounded(value: unknown, fallback: number, minimum: number, maximum: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}
