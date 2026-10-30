import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import * as AlarmScheduler from '@dawn/alarm-scheduler';
import { getWakeAlarms, getWakePreferences, saveWakeAlarms, type WakeAlarm } from '@/storage/wake-data';

const COLORS = { background: '#F6F4ED', ink: '#1C302B', muted: '#71817A', line: '#DDE2D9', accent: '#D87845', white: '#FFFDF7' };

export default function AlarmsScreen() {
  const [alarms, setAlarms] = useState<WakeAlarm[]>([]);
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('Wake up');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getWakeAlarms().then(setAlarms).finally(() => setLoading(false));
  }, []);

  async function addAlarm() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('Enter a time in 24-hour format, such as 06:30.');
      return;
    }
    setError(null);
    try {
      if (!(await AlarmScheduler.canScheduleExactAlarms())) {
        Alert.alert('Exact alarms are off', 'Allow exact alarms in Android settings, then add this wake time again.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => void AlarmScheduler.openExactAlarmSettings() },
        ]);
        return;
      }
      const [hours, minutes] = time.split(':').map(Number);
      const wakeAt = new Date();
      wakeAt.setHours(hours, minutes, 0, 0);
      if (wakeAt.getTime() <= Date.now()) wakeAt.setDate(wakeAt.getDate() + 1);
      const alarm: WakeAlarm = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: label.trim() || 'Wake up',
        wakeAtMillis: wakeAt.getTime(),
      };
      const preferences = await getWakePreferences();
      await AlarmScheduler.scheduleAlarm({ ...alarm, sunriseMinutes: preferences.sunriseMinutes, ringDelayMinutes: preferences.ringDelayMinutes });
      const updated = [...alarms, alarm].sort((first, second) => first.wakeAtMillis - second.wakeAtMillis);
      await saveWakeAlarms(updated);
      setAlarms(updated);
    } catch {
      setError('The wake time could not be scheduled. Check Android alarm permissions.');
    }
  }

  async function removeAlarm(alarm: WakeAlarm) {
    await AlarmScheduler.cancelAlarm(alarm.id);
    const updated = alarms.filter((item) => item.id !== alarm.id);
    await saveWakeAlarms(updated);
    setAlarms(updated);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topline}>
          <Text style={styles.kicker}>DAWN / YOUR ROUTINE</Text>
        </View>
        <Text style={styles.title}>{'A softer\nstart.'}</Text>
        <Text style={styles.subtitle}>Your mornings, gently in motion.</Text>

        <View style={styles.form}>
          <Text style={styles.formTitle}>SET A WAKE TIME</Text>
          <View style={styles.fields}>
            <TextInput accessibilityLabel="Wake time" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} style={styles.timeInput} />
            <TextInput accessibilityLabel="Alarm label" value={label} onChangeText={setLabel} maxLength={32} style={styles.labelInput} />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" onPress={() => void addAlarm()} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Text style={styles.addText}>＋  Add wake time</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Text style={styles.count}>{String(alarms.length).padStart(2, '0')}</Text>
        </View>
        {loading ? <Text style={styles.emptyCopy}>Loading local wake times…</Text> : alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyMark}>06:30</Text>
            <Text style={styles.emptyTitle}>Room for a new ritual</Text>
            <Text style={styles.emptyCopy}>Add a wake time and let the day arrive slowly.</Text>
          </View>
        ) : (
          <View style={styles.alarmList}>
            {alarms.map((alarm) => (
              <View key={alarm.id} style={styles.alarmRow}>
                <View style={styles.alarmDetails}>
                  <Text style={styles.alarmTime}>{new Date(alarm.wakeAtMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                  <Text style={styles.alarmLabel}>{alarm.label} · {new Date(alarm.wakeAtMillis).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${alarm.label}`} onPress={() => void removeAlarm(alarm)} hitSlop={12}>
                  <Text style={styles.remove}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.push('/test')} style={styles.testLink}>
          <Text style={styles.testLinkText}>Preview the wake sequence  ↗</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 36 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: COLORS.ink, fontFamily: 'serif', fontSize: 48, lineHeight: 52, marginTop: 20 },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 8 },
  form: { marginTop: 30, padding: 18, backgroundColor: COLORS.white, borderRadius: 8 },
  formTitle: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  fields: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  timeInput: { color: COLORS.ink, fontFamily: 'serif', fontSize: 37, minWidth: 122, paddingVertical: 0 },
  labelInput: { color: COLORS.muted, fontSize: 14, flex: 1, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 8 },
  error: { color: '#A23D2A', fontSize: 12, marginTop: 10 },
  addButton: { height: 48, borderRadius: 5, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  addText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 32, marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontFamily: 'serif', fontSize: 24 },
  count: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 22, paddingBottom: 20 },
  emptyMark: { color: '#BBC2B4', fontFamily: 'serif', fontSize: 32 },
  emptyTitle: { color: COLORS.ink, fontFamily: 'serif', fontSize: 18, marginTop: 10 },
  emptyCopy: { color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: 6 },
  alarmList: { borderTopWidth: 1, borderTopColor: COLORS.line },
  alarmRow: { minHeight: 74, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', alignItems: 'center' },
  alarmDetails: { flex: 1 },
  alarmTime: { color: COLORS.ink, fontFamily: 'serif', fontSize: 29, lineHeight: 35 },
  alarmLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  remove: { color: '#A23D2A', fontSize: 25, paddingHorizontal: 8 },
  testLink: { alignSelf: 'center', paddingVertical: 16, marginTop: 'auto' },
  testLinkText: { color: COLORS.ink, fontSize: 12, fontWeight: '600' },
});
