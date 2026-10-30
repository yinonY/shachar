import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { DEFAULT_PREFERENCES, getWakeAlarms, getWakePreferences, saveWakePreferences, type WakePreferences } from '@/storage/wake-data';
import * as AlarmScheduler from '@dawn/alarm-scheduler';

const COLORS = { background: '#F6F4ED', ink: '#1C302B', muted: '#71817A', line: '#DDE2D9', accent: '#D87845', white: '#FFFDF7' };

export default function SettingsScreen() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);
  const hebrew = preferences.language === 'he';

  useFocusEffect(useCallback(() => {
    let active = true;
    void getWakePreferences().then((stored) => {
      if (active) setPreferences(stored);
    });
    return () => { active = false; };
  }, []));

  function update<K extends keyof WakePreferences>(key: K, value: WakePreferences[K]) {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    await saveWakePreferences(preferences);
    if (Platform.OS === 'android') {
      const alarms = await getWakeAlarms();
      await Promise.all(alarms.map((alarm) => AlarmScheduler.scheduleAlarm({
        ...alarm,
        sunriseMinutes: preferences.sunriseMinutes,
        ringDelayMinutes: preferences.ringDelayMinutes,
      })));
    }
    setSaved(true);
  }

  const languageText = hebrew ? 'עברית ומימין לשמאל' : 'Hebrew and right-to-left';
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, hebrew && styles.rtlContainer]}>
        <Text style={styles.kicker}>DAWN / SETTINGS</Text>
        <Text style={styles.title}>{hebrew ? 'בוקר, בדרך שלך.' : 'Make it yours.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/reliability')} style={styles.deviceCheck}>
          <Text style={styles.deviceCheckText}>{hebrew ? 'בדיקת הגדרות המכשיר  ›' : 'Review Android reliability settings  ›'}</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, hebrew && styles.rtl]}>{hebrew ? 'רצף ההתעוררות' : 'Wake sequence'}</Text>
        <View style={styles.group}>
          <NumberRow key={`sunrise-${preferences.sunriseMinutes}`} hebrew={hebrew} label={hebrew ? 'זריחה, דקות' : 'Sunrise, minutes'} value={preferences.sunriseMinutes} maximum={180} onChange={(value) => update('sunriseMinutes', value)} />
          <NumberRow key={`birdsong-${preferences.birdsongMinutes}`} hebrew={hebrew} label={hebrew ? 'שירת ציפורים, דקות לפני' : 'Birdsong, minutes before'} value={preferences.birdsongMinutes} maximum={180} onChange={(value) => update('birdsongMinutes', value)} />
          <NumberRow key={`ambience-${preferences.ambienceMinutes}`} hebrew={hebrew} label={hebrew ? 'אווירה, דקות לפני' : 'Ambience, minutes before'} value={preferences.ambienceMinutes} maximum={180} onChange={(value) => update('ambienceMinutes', value)} />
          <NumberRow key={`ring-${preferences.ringDelayMinutes}`} hebrew={hebrew} label={hebrew ? 'צלצול סופי, דקות אחרי' : 'Final ring, minutes after'} value={preferences.ringDelayMinutes} maximum={120} onChange={(value) => update('ringDelayMinutes', value)} />
        </View>

        <Text style={[styles.sectionTitle, hebrew && styles.rtl]}>{hebrew ? 'צליל ושפה' : 'Sound and language'}</Text>
        <View style={styles.group}>
          <Text style={[styles.rowLabel, hebrew && styles.rtl]}>{hebrew ? 'צליל עדין' : 'Gentle sound'}</Text>
          <View style={[styles.options, hebrew && styles.rowRtl]}>
            {(['birds', 'rain', 'tone'] as const).map((sound) => (
              <Pressable key={sound} accessibilityRole="button" accessibilityState={{ selected: preferences.sound === sound }} onPress={() => update('sound', sound)} style={[styles.option, preferences.sound === sound && styles.optionSelected]}>
                <Text style={[styles.optionText, preferences.sound === sound && styles.optionTextSelected]}>{soundName(sound, hebrew)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.divider} />
          <View style={[styles.languageRow, hebrew && styles.rowRtl]}>
            <Text style={[styles.rowLabel, hebrew && styles.rtl]}>{languageText}</Text>
            <Switch value={hebrew} onValueChange={(value) => update('language', value ? 'he' : 'en')} trackColor={{ true: '#A5B6A6' }} thumbColor={COLORS.ink} />
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => void save()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <Text style={styles.saveText}>{saved ? (hebrew ? 'נשמר' : 'Saved') : (hebrew ? 'שמירת העדפות' : 'Save preferences')}</Text>
        </Pressable>
        <Text style={styles.footer}>{hebrew ? 'הנתונים נשמרים במכשיר הזה.' : 'Wake times and preferences stay on this device.'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function NumberRow({ label, value, maximum, onChange, hebrew }: { label: string; value: number; maximum: number; onChange: (value: number) => void; hebrew: boolean }) {
  const [text, setText] = useState(String(value));
  return (
    <View style={[styles.numberRow, hebrew && styles.rowRtl]}>
      <Text style={[styles.rowLabel, hebrew && styles.rtl]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        value={text}
        onChangeText={(next) => {
          const digits = next.replace(/\D/g, '').slice(0, 3);
          setText(digits);
        }}
        onBlur={() => {
          const normalized = text === '' ? 0 : Math.min(maximum, Number(text));
          setText(String(normalized));
          onChange(normalized);
        }}
        style={styles.numberInput}
      />
    </View>
  );
}

function soundName(sound: WakePreferences['sound'], hebrew: boolean) {
  if (hebrew) return sound === 'birds' ? 'ציפורים' : sound === 'rain' ? 'גשם' : 'צליל';
  return sound === 'birds' ? 'Birds' : sound === 'rain' ? 'Rain' : 'Tone';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 32 },
  kicker: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: COLORS.ink, fontFamily: 'serif', fontSize: 38, lineHeight: 45, marginTop: 18, marginBottom: 28 },
  deviceCheck: { alignSelf: 'flex-start', marginTop: -18, marginBottom: 20, paddingVertical: 8 },
  deviceCheckText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: COLORS.ink, fontFamily: 'serif', fontSize: 21, marginTop: 22, marginBottom: 10 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  rtlContainer: { direction: 'rtl' },
  rowRtl: { flexDirection: 'row-reverse' },
  group: { backgroundColor: COLORS.white, borderRadius: 7, paddingHorizontal: 15 },
  numberRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  rowLabel: { color: COLORS.ink, fontSize: 13, flex: 1 },
  numberInput: { color: COLORS.ink, fontSize: 15, fontWeight: '700', textAlign: 'center', width: 54, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 6 },
  options: { flexDirection: 'row', gap: 8, paddingVertical: 13 },
  option: { minWidth: 72, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, alignItems: 'center' },
  optionSelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  optionText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  optionTextSelected: { color: COLORS.white },
  divider: { height: 1, backgroundColor: COLORS.line },
  languageRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  saveButton: { minHeight: 52, backgroundColor: COLORS.accent, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  footer: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
