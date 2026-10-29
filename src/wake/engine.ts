export type WakePhase = 'idle' | 'sunrise' | 'birdsong' | 'ambience' | 'waking' | 'ringing';

export type WakeSettings = {
  sunriseMinutes: number;
  birdsongMinutes: number;
  ambienceMinutes: number;
  ringDelayMinutes: number;
};

export type WakeState = {
  phase: WakePhase;
  brightness: number;
  birdsongVolume: number;
  ambienceVolume: number;
  ringVolume: number;
  vibrationIntervalMs: number | null;
  shouldRing: boolean;
};

export const DEFAULT_WAKE_SETTINGS: WakeSettings = {
  sunriseMinutes: 30,
  birdsongMinutes: 15,
  ambienceMinutes: 5,
  ringDelayMinutes: 5,
};

const MINUTE_MS = 60_000;

function progress(elapsed: number, duration: number) {
  if (duration <= 0) return 1;
  const value = Math.max(0, Math.min(1, elapsed / duration));
  return value * value * (3 - 2 * value);
}

export function getWakeState(
  nowMs: number,
  wakeAtMs: number,
  settings: WakeSettings = DEFAULT_WAKE_SETTINGS,
): WakeState {
  const untilWakeMs = wakeAtMs - nowMs;
  const sunriseMs = Math.max(0, settings.sunriseMinutes * MINUTE_MS);
  const birdsongMs = Math.max(0, settings.birdsongMinutes * MINUTE_MS);
  const ambienceMs = Math.max(0, settings.ambienceMinutes * MINUTE_MS);
  const ringDelayMs = Math.max(0, settings.ringDelayMinutes * MINUTE_MS);

  if (untilWakeMs > sunriseMs) {
    return {
      phase: 'idle',
      brightness: 0,
      birdsongVolume: 0,
      ambienceVolume: 0,
      ringVolume: 0,
      vibrationIntervalMs: null,
      shouldRing: false,
    };
  }

  const sunriseProgress = progress(sunriseMs - untilWakeMs, sunriseMs);
  const birdsongProgress = progress(birdsongMs - untilWakeMs, birdsongMs);
  const ambienceProgress = progress(ambienceMs - untilWakeMs, ambienceMs);
  const isRinging = untilWakeMs <= -ringDelayMs;
  const phase: WakePhase = isRinging
    ? 'ringing'
    : untilWakeMs <= 0
      ? 'waking'
      : untilWakeMs <= ambienceMs
        ? 'ambience'
        : untilWakeMs <= birdsongMs
          ? 'birdsong'
          : 'sunrise';

  return {
    phase,
    brightness: 0.025 + sunriseProgress * 0.775,
    birdsongVolume: birdsongProgress * 0.35,
    ambienceVolume: ambienceProgress * 0.25,
    ringVolume: isRinging ? 1 : 0,
    vibrationIntervalMs: untilWakeMs <= 0 ? 500 : untilWakeMs <= ambienceMs ? 1_200 : null,
    shouldRing: isRinging,
  };
}