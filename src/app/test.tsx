import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    Vibration,
    View,
} from 'react-native';

import { DEFAULT_WAKE_SETTINGS, getWakeState, type WakePhase } from '@/wake/engine';
import * as AlarmScheduler from '@dawn/alarm-scheduler';
import { DEFAULT_PREFERENCES, getWakePreferences } from '@/storage/wake-data';

const TEST_SETTINGS = {
  ...DEFAULT_WAKE_SETTINGS,
  sunriseMinutes: 0.5,
  birdsongMinutes: 0.25,
  ambienceMinutes: 0.1,
  ringDelayMinutes: 0.25,
};
const WAKE_TEST_TAG = 'dawn-wake-test';
const phaseLabels: Record<WakePhase, string> = {
  idle: 'Ready when you are',
  sunrise: 'A little light is arriving',
  birdsong: 'Birdsong is joining in',
  ambience: 'The room is beginning to wake',
  waking: 'Wake time',
  ringing: 'Time to rise',
};
const hebrewPhaseLabels: Record<WakePhase, string> = {
  idle: 'מוכנים כשתהיו',
  sunrise: 'האור מתחיל להגיע',
  birdsong: 'ציוץ הבוקר מצטרף',
  ambience: 'החדר מתעורר לאט',
  waking: 'הגיע הזמן לקום',
  ringing: 'בוקר טוב',
};

export default function WakeTestScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    alarmId?: string;
    wakeAt?: string;
    sunriseMinutes?: string;
    ringDelayMinutes?: string;
    label?: string;
  }>();
  const birds = useAudioPlayer(require('@/assets/audio/birdsong.wav'));
  const rain = useAudioPlayer(require('@/assets/audio/rain.wav'));
  const tone = useAudioPlayer(require('@/assets/audio/tone.wav'));
  const ambience = useAudioPlayer(require('@/assets/audio/ambience.wav'));
  const alarm = useAudioPlayer(require('@/assets/audio/alarm.wav'));
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [wakeAt, setWakeAt] = useState<number | null>(() =>
    params.mode === 'alarm' && params.wakeAt && Number.isFinite(Number(params.wakeAt))
      ? Number(params.wakeAt)
      : null,
  );
  const [now, setNow] = useState(0);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);
  const [effectError, setEffectError] = useState<string | null>(null);
  const originalBrightnessRef = useRef<number | null>(null);
  const alarmMode = params.mode === 'alarm' && Boolean(params.alarmId);
  const settings = alarmMode
    ? {
        ...DEFAULT_WAKE_SETTINGS,
        sunriseMinutes: Number(params.sunriseMinutes ?? preferences.sunriseMinutes),
        birdsongMinutes: preferences.birdsongMinutes,
        ambienceMinutes: preferences.ambienceMinutes,
        ringDelayMinutes: Number(params.ringDelayMinutes ?? preferences.ringDelayMinutes),
      }
    : TEST_SETTINGS;
  const running = wakeAt !== null;
  const wakeState = running && wakeAt !== null ? getWakeState(now, wakeAt, settings) : null;
  const gentleSound = preferences.sound === 'rain' ? rain : preferences.sound === 'tone' ? tone : birds;
  const lockScreenPlayer = wakeState?.shouldRing ? alarm : gentleSound;
  const labels = preferences.language === 'he' ? hebrewPhaseLabels : phaseLabels;

  useEffect(() => {
    void getWakePreferences().then(setPreferences);
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    void Brightness.getBrightnessAsync().then((value) => {
      originalBrightnessRef.current = value;
      setOriginalBrightness(value);
    }).catch(() => undefined);
    return () => {
      deactivateKeepAwake(WAKE_TEST_TAG);
      Vibration.cancel();
      birds.pause();
      rain.pause();
      tone.pause();
      ambience.pause();
      alarm.pause();
      if (originalBrightnessRef.current !== null) {
        void Brightness.setBrightnessAsync(originalBrightnessRef.current).catch(() => undefined);
      }
    };
  }, [alarm, ambience, birds, rain, tone]);

  useEffect(() => {
    if (alarmMode && wakeAt !== null) {
      void activateKeepAwakeAsync(WAKE_TEST_TAG);
    }
  }, [alarmMode, wakeAt]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    lockScreenPlayer.setActiveForLockScreen(true, {
      title: 'Dawn Alarm',
      artist: 'Wake sequence',
    });
    return () => lockScreenPlayer.setActiveForLockScreen(false);
  }, [lockScreenPlayer, running]);

  useEffect(() => {
    if (!wakeState) {
      birds.pause();
      rain.pause();
      tone.pause();
      ambience.pause();
      alarm.pause();
      return;
    }

    const updatePlayer = (player: typeof birds, volume: number) => {
      player.loop = true;
      player.volume = volume;
      if (volume > 0 && !player.playing) player.play();
      if (volume === 0 && player.playing) player.pause();
    };

    updatePlayer(gentleSound, wakeState.birdsongVolume);
    updatePlayer(ambience, wakeState.ambienceVolume);
    updatePlayer(alarm, wakeState.ringVolume);
    void Brightness.setBrightnessAsync(wakeState.brightness).catch(() => undefined);
  }, [alarm, ambience, birds, gentleSound, rain, tone, wakeState]);

  useEffect(() => {
    if (!wakeState?.vibrationIntervalMs) {
      Vibration.cancel();
      return;
    }

    const pulse = () => {
      if (Platform.OS === 'android') {
        Vibration.vibrate(100);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    pulse();
    const timer = setInterval(pulse, wakeState.vibrationIntervalMs);
    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, [wakeState?.vibrationIntervalMs]);

  async function startTest() {
    try {
      setEffectError(null);
      const currentBrightness = await Brightness.getBrightnessAsync();
      originalBrightnessRef.current = currentBrightness;
      setOriginalBrightness(currentBrightness);
      await activateKeepAwakeAsync(WAKE_TEST_TAG);
      const start = Date.now();
      setNow(start);
      setWakeAt(start + 30_000);
    } catch {
      setEffectError('The test could not start. Check device sound and display settings.');
    }
  }

  async function stopTest() {
    setWakeAt(null);
    deactivateKeepAwake(WAKE_TEST_TAG);
    Vibration.cancel();
    if (alarmMode && params.alarmId) {
      await AlarmScheduler.dismissAlarm(params.alarmId).catch(() => undefined);
    }
    if (originalBrightness !== null) {
      await Brightness.setBrightnessAsync(originalBrightness).catch(() => undefined);
    }
  }

  async function snooze() {
    if (params.alarmId) {
      await AlarmScheduler.snoozeAlarm(params.alarmId, 9);
      setWakeAt(null);
      deactivateKeepAwake(WAKE_TEST_TAG);
      Vibration.cancel();
      if (originalBrightness !== null) {
        await Brightness.setBrightnessAsync(originalBrightness).catch(() => undefined);
      }
    }
  }

  const remainingSeconds = wakeAt === null ? 0 : Math.max(0, Math.ceil((wakeAt - now) / 1_000));

  return (
    <View style={styles.screen}>
      <StatusBar hidden={running} barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{preferences.language === 'he' ? 'DAWN / בדיקת רצף' : 'DAWN / SOUND CHECK'}</Text>
            <View style={[styles.statusDot, running && styles.statusDotActive]} />
          </View>

          <Text style={[styles.title, preferences.language === 'he' && styles.rtl]}>{running ? labels[wakeState?.phase ?? 'idle'] : preferences.language === 'he' ? 'נסו את הבוקר, עכשיו.' : 'Try the morning, now.'}</Text>
          <Text style={styles.description}>
            {running
              ? alarmMode
                ? (params.label || (preferences.language === 'he' ? 'רצף ההתעוררות התחיל.' : 'Your wake sequence is underway.'))
                : preferences.language === 'he' ? 'הרצף מתקדם במהירות כדי לבדוק כל שלב.' : 'The sequence runs quickly so you can check each layer.'
              : preferences.language === 'he' ? 'תצוגה מקדימה של אור, צליל, רטט וצלצול.' : 'A one-minute preview of light, birdsong, ambience, and the final alarm.'}
          </Text>

          <View style={styles.sequence}>
            <SequenceRow label={preferences.language === 'he' ? 'זריחה' : 'Sunrise'} value={wakeState?.brightness ?? 0} color="#F1B477" />
            <SequenceRow label={preferences.language === 'he' ? 'צליל' : preferences.sound} value={(wakeState?.birdsongVolume ?? 0) / 0.35} color="#9DC9A9" />
            <SequenceRow label={preferences.language === 'he' ? 'אווירה' : 'Ambience'} value={(wakeState?.ambienceVolume ?? 0) / 0.25} color="#91B5BB" />
            <SequenceRow label={preferences.language === 'he' ? 'צלצול סופי' : 'Final alarm'} value={wakeState?.ringVolume ?? 0} color="#E77E57" />
          </View>

          {running ? (
            <View style={styles.clock}>
              <Text style={styles.clockLabel}>{preferences.language === 'he' ? 'ההתעוררות בעוד' : 'WAKE TIME IN'}</Text>
              <Text style={styles.clockValue}>{`${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`}</Text>
              <Text style={styles.phase}>{wakeState ? labels[wakeState.phase] : ''}</Text>
            </View>
          ) : (
            <View style={styles.noteRow}>
              <Text style={styles.noteMark}>i</Text>
              <Text style={styles.noteText}>{preferences.language === 'he' ? 'התצוגה לא משנה את הגדרות ההתעוררות.' : 'Your saved wake settings are not changed by this preview.'}</Text>
            </View>
          )}

          {effectError && <Text style={styles.error}>{effectError}</Text>}

          {alarmMode && running && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void snooze()}
              style={({ pressed }) => [styles.snoozeAction, pressed && styles.pressed]}>
              <Text style={styles.snoozeText}>{preferences.language === 'he' ? 'נודניק 9 דקות' : 'Snooze 9 minutes'}</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={running ? () => void stopTest() : () => void startTest()}
            style={({ pressed }) => [styles.action, running && styles.stopAction, pressed && styles.pressed]}>
            <Text style={styles.actionText}>
              {running
                ? alarmMode ? (preferences.language === 'he' ? 'כיבוי השעון' : 'Dismiss alarm') : (preferences.language === 'he' ? 'עצירת התצוגה' : 'Stop preview')
                : preferences.language === 'he' ? 'התחלת תצוגה של דקה' : 'Start one-minute preview'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SequenceRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.sequenceRow}>
      <Text style={styles.sequenceLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, value)) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#14251F' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 26 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#AFC0B4', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#728077' },
  statusDotActive: { backgroundColor: '#F1B477' },
  title: { color: '#FFF8EA', fontFamily: 'serif', fontSize: 38, lineHeight: 44, marginTop: 34 },
  description: { color: '#B6C5B9', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 340 },
  sequence: { gap: 18, marginTop: 42, borderTopWidth: 1, borderTopColor: '#405148', borderBottomWidth: 1, borderBottomColor: '#405148', paddingVertical: 22 },
  sequenceRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sequenceLabel: { color: '#E8ECDD', fontSize: 13, width: 95 },
  track: { height: 4, backgroundColor: '#35463D', flex: 1, overflow: 'hidden' },
  fill: { height: '100%' },
  clock: { alignItems: 'center', marginTop: 38 },
  clockLabel: { color: '#AFC0B4', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  clockValue: { color: '#FFF8EA', fontFamily: 'serif', fontSize: 48, lineHeight: 56, marginTop: 5 },
  phase: { color: '#F1B477', fontSize: 13, marginTop: 2 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 34 },
  noteMark: { color: '#F1B477', borderColor: '#F1B477', borderWidth: 1, width: 18, height: 18, textAlign: 'center', borderRadius: 9, overflow: 'hidden', fontSize: 11, lineHeight: 16 },
  noteText: { color: '#B6C5B9', fontSize: 12, flex: 1, lineHeight: 18 },
  error: { color: '#F1A18A', fontSize: 12, marginTop: 16 },
  action: { height: 54, borderRadius: 6, backgroundColor: '#D87845', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', marginBottom: 8 },
  stopAction: { backgroundColor: '#506359' },
  snoozeAction: { height: 48, borderRadius: 6, borderColor: '#72877B', borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 8 },
  snoozeText: { color: '#E8ECDD', fontSize: 14, fontWeight: '600' },
  actionText: { color: '#FFF8EA', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.82 },
});