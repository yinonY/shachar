import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getRepeatLabel } from '@/state/alarm';
import { useAlarms } from '@/state/alarm-context';

const COLORS = {
  background: '#F6F4ED',
  ink: '#1C302B',
  muted: '#71817A',
  line: '#DDE2D9',
  accent: '#D87845',
  white: '#FFFDF7',
};

export default function AlarmListScreen() {
  const { alarms, ready, error, toggleAlarm } = useAlarms();
  const nextAlarm = useMemo(() => {
    const enabled = alarms.filter((alarm) => alarm.enabled);
    if (!enabled.length) return null;
    const now = new Date();
    return enabled
      .map((alarm) => ({ alarm, delay: getDelayUntilAlarm(alarm.time, alarm.repeatDays, now) }))
      .sort((left, right) => left.delay - right.delay)[0];
  }, [alarms]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topline}>
          <Text style={styles.kicker}>DAWN / 01</Text>
          <View style={styles.statusDot} />
        </View>
        <Text style={styles.title}>{'A softer\nstart.'}</Text>
        <Text style={styles.subtitle}>Your mornings, gently in motion.</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>NEXT WAKE</Text>
          {nextAlarm ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTime}>{nextAlarm.alarm.time}</Text>
              <Text style={styles.summaryHint}>{formatCountdown(nextAlarm.delay)}</Text>
            </View>
          ) : (
            <Text style={styles.summaryEmpty}>Set a time that feels right</Text>
          )}
          <View style={styles.sunTrack}>
            <View style={styles.sunrise} />
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Your alarms</Text>
          <Text style={styles.count}>{alarms.length.toString().padStart(2, '0')}</Text>
        </View>

        {!ready ? (
          <Text style={styles.feedback}>Loading your alarms...</Text>
        ) : alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyMark}>06:30</Text>
            <Text style={styles.emptyTitle}>Room for a new ritual</Text>
            <Text style={styles.emptyCopy}>Create an alarm and let the day arrive slowly.</Text>
          </View>
        ) : (
          <View style={styles.alarmList}>
            {alarms
              .slice()
              .sort((left, right) => left.time.localeCompare(right.time))
              .map((alarm) => (
                <View key={alarm.id} style={[styles.alarmRow, !alarm.enabled && styles.disabledRow]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit alarm at ${alarm.time}`}
                    onPress={() => router.push(`/alarm/${alarm.id}`)}
                    style={styles.alarmDetails}>
                    <Text style={styles.alarmTime}>{alarm.time}</Text>
                    <Text style={styles.alarmLabel} numberOfLines={1}>
                      {alarm.label || 'Wake up'} · {getRepeatLabel(alarm.repeatDays)}
                    </Text>
                  </Pressable>
                  <Switch
                    accessibilityLabel={`${alarm.enabled ? 'Disable' : 'Enable'} ${alarm.time} alarm`}
                    value={alarm.enabled}
                    onValueChange={() => void toggleAlarm(alarm.id)}
                    trackColor={{ false: '#C9D0C8', true: '#A5B6A6' }}
                    thumbColor={alarm.enabled ? COLORS.ink : '#F6F4ED'}
                  />
                </View>
              ))}
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/alarm/new')}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addText}>Add an alarm</Text>
        </Pressable>
        <Text style={styles.footerNote}>A little light, right on time.</Text>
      </View>
    </SafeAreaView>
  );
}

function getDelayUntilAlarm(time: string, repeatDays: number[], now: Date) {
  const [hours, minutes] = time.split(':').map(Number);
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);
    const repeatsToday = repeatDays.length === 0 || repeatDays.includes(candidate.getDay());
    if (repeatsToday && candidate.getTime() > now.getTime()) return candidate.getTime() - now.getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

function formatCountdown(milliseconds: number) {
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `in ${hours}h ${minutes}m`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 28 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  title: { color: COLORS.ink, fontFamily: 'serif', fontSize: 50, lineHeight: 54, marginTop: 23 },
  subtitle: { color: COLORS.muted, fontSize: 15, marginTop: 10 },
  summary: { backgroundColor: COLORS.ink, borderRadius: 8, marginTop: 30, padding: 20, overflow: 'hidden' },
  summaryLabel: { color: '#AFC0B4', fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 10 },
  summaryTime: { color: COLORS.white, fontFamily: 'serif', fontSize: 37, lineHeight: 43 },
  summaryHint: { color: '#B6C5B9', fontSize: 13 },
  summaryEmpty: { color: COLORS.white, fontFamily: 'serif', fontSize: 22, marginTop: 16 },
  sunTrack: { height: 3, backgroundColor: '#465B51', borderRadius: 2, marginTop: 22 },
  sunrise: { width: '36%', height: 3, backgroundColor: '#F0B47B', borderRadius: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 34, marginBottom: 14 },
  sectionTitle: { color: COLORS.ink, fontFamily: 'serif', fontSize: 25 },
  count: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  feedback: { color: COLORS.muted, paddingVertical: 26, fontSize: 14 },
  emptyState: { alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 28, paddingBottom: 30 },
  emptyMark: { color: '#BBC2B4', fontFamily: 'serif', fontSize: 33 },
  emptyTitle: { color: COLORS.ink, fontFamily: 'serif', fontSize: 19, marginTop: 12 },
  emptyCopy: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 6 },
  alarmList: { borderTopWidth: 1, borderTopColor: COLORS.line },
  alarmRow: { minHeight: 90, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', alignItems: 'center' },
  disabledRow: { opacity: 0.48 },
  alarmDetails: { flex: 1, paddingVertical: 14 },
  alarmTime: { color: COLORS.ink, fontFamily: 'serif', fontSize: 34, lineHeight: 40 },
  alarmLabel: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  error: { color: '#A23D2A', fontSize: 13, marginTop: 14 },
  footer: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 14, backgroundColor: COLORS.background },
  addButton: { height: 56, borderRadius: 6, backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  addIcon: { color: '#FFFDF7', fontSize: 24, lineHeight: 25 },
  addText: { color: '#FFFDF7', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  footerNote: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
