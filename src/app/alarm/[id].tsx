import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WEEKDAYS, type Alarm } from '@/state/alarm';
import { useAlarms } from '@/state/alarm-context';

const COLORS = {
  background: '#F6F4ED',
  ink: '#1C302B',
  muted: '#71817A',
  line: '#DDE2D9',
  accent: '#D87845',
  white: '#FFFDF7',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EditAlarmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { alarms, ready, error, saveAlarm, deleteAlarm } = useAlarms();
  const existing = alarms.find((alarm) => alarm.id === id);

  if (!ready) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.loading}>Loading alarm...</Text>
      </SafeAreaView>
    );
  }

  if (id !== 'new' && !existing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹  Alarms</Text>
        </Pressable>
        <Text style={styles.loading}>This alarm is no longer available.</Text>
      </SafeAreaView>
    );
  }

  return (
    <AlarmForm
      key={id}
      id={id}
      alarm={existing}
      error={error}
      saveAlarm={saveAlarm}
      deleteAlarm={deleteAlarm}
    />
  );
}

function AlarmForm({
  id,
  alarm,
  error,
  saveAlarm,
  deleteAlarm,
}: {
  id: string;
  alarm: Alarm | undefined;
  error: string | null;
  saveAlarm: (alarm: Alarm) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
}) {
  const existing = alarm;
  const [time, setTime] = useState(existing?.time ?? '06:30');
  const [label, setLabel] = useState(existing?.label ?? 'Wake up gently');
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [repeatDays, setRepeatDays] = useState(existing?.repeatDays ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const isNew = id === 'new';

  async function handleSave() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setMessage('Enter a time in 24-hour format, such as 06:30.');
      return;
    }

    const alarm: Alarm = {
      id: isNew ? `${Date.now()}` : id,
      time,
      label: label.trim() || 'Wake up',
      enabled,
      repeatDays: repeatDays.slice().sort(),
    };

    try {
      await saveAlarm(alarm);
      router.back();
    } catch {
      setMessage('Could not save this alarm. Check device storage and try again.');
    }
  }

  async function handleDelete() {
    try {
      await deleteAlarm(id);
      router.back();
    } catch {
      setMessage('Could not delete this alarm. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹  Alarms</Text>
        </Pressable>
        <Text style={styles.kicker}>{isNew ? 'A NEW MORNING' : 'MAKE IT YOURS'}</Text>
        <Text style={styles.title}>{isNew ? 'Set your\nwake time.' : 'Rise at\nyour pace.'}</Text>

        <View style={styles.timePanel}>
          <Text style={styles.fieldLabel}>WAKE TIME</Text>
          <TextInput
            accessibilityLabel="Wake time, 24-hour format"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, '').slice(0, 4);
              setTime(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
            }}
            placeholder="06:30"
            placeholderTextColor="#8E9A91"
            style={styles.timeInput}
            value={time}
          />
          <Text style={styles.timeHint}>24-hour time</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ALARM NAME</Text>
          <TextInput
            accessibilityLabel="Alarm name"
            maxLength={32}
            onChangeText={setLabel}
            placeholder="Wake up gently"
            placeholderTextColor="#8E9A91"
            style={styles.nameInput}
            value={label}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.repeatHeader}>
            <Text style={styles.fieldLabel}>REPEAT</Text>
            <Text style={styles.repeatHint}>{getRepeatSummary(repeatDays)}</Text>
          </View>
          <View style={styles.days}>
            {WEEKDAYS.map((day, index) => {
              const selected = repeatDays.includes(index);
              return (
                <Pressable
                  key={`${day}-${index}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={DAY_NAMES[index]}
                  onPress={() =>
                    setRepeatDays((current) =>
                      selected ? current.filter((value) => value !== index) : [...current, index],
                    )
                  }
                  style={[styles.day, selected && styles.daySelected]}>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.enabledRow}>
          <View>
            <Text style={styles.enabledTitle}>Alarm enabled</Text>
            <Text style={styles.enabledDescription}>Ready for the next morning</Text>
          </View>
          <Switch
            accessibilityLabel="Alarm enabled"
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#C9D0C8', true: '#A5B6A6' }}
            thumbColor={enabled ? COLORS.ink : '#F6F4ED'}
          />
        </View>

        {(message || error) && <Text style={styles.error}>{message ?? error}</Text>}
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSave()}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <Text style={styles.saveText}>Save alarm</Text>
        </Pressable>
        {!isNew && (
          <Pressable accessibilityRole="button" onPress={() => void handleDelete()} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete alarm</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getRepeatSummary(days: number[]) {
  if (days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) return 'Weekdays';
  if (days.length === 2 && [0, 6].every((day) => days.includes(day))) return 'Weekends';
  return `${days.length} days`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 26, paddingTop: 8, paddingBottom: 32 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 12, paddingRight: 20 },
  backText: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  kicker: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginTop: 18 },
  title: { color: COLORS.ink, fontFamily: 'serif', fontSize: 43, lineHeight: 47, marginTop: 10 },
  timePanel: { alignItems: 'center', backgroundColor: COLORS.ink, borderRadius: 8, marginTop: 25, paddingVertical: 18 },
  fieldLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  timeInput: { minWidth: 190, color: COLORS.white, fontFamily: 'serif', fontSize: 53, lineHeight: 62, paddingVertical: 0, textAlign: 'center', marginTop: 3 },
  timeHint: { color: '#AFC0B4', fontSize: 11, marginTop: 3 },
  field: { borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 19 },
  nameInput: { color: COLORS.ink, fontSize: 16, paddingVertical: 10 },
  repeatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repeatHint: { color: COLORS.muted, fontSize: 12 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  day: { width: 38, height: 38, borderRadius: 19, borderColor: '#C9D0C8', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dayText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  dayTextSelected: { color: COLORS.white },
  enabledRow: { minHeight: 75, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enabledTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  enabledDescription: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  error: { color: '#A23D2A', fontSize: 13, marginTop: 14 },
  saveButton: { minHeight: 54, backgroundColor: COLORS.accent, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  saveText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  deleteButton: { alignSelf: 'center', padding: 14, marginTop: 8 },
  deleteText: { color: '#A23D2A', fontSize: 13, fontWeight: '600' },
  loading: { color: COLORS.muted, fontSize: 15, padding: 26 },
  pressed: { opacity: 0.82 },
});