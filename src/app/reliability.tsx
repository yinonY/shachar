import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import * as AlarmScheduler from '@dawn/alarm-scheduler';

const COLORS = { background: '#F6F4ED', ink: '#1C302B', muted: '#71817A', line: '#DDE2D9', accent: '#D87845', white: '#FFFDF7' };
type PermissionState = { exact: boolean; fullScreen: boolean; notifications: boolean; battery: boolean };
const EMPTY_PERMISSIONS: PermissionState = { exact: false, fullScreen: false, notifications: false, battery: false };

export default function ReliabilityScreen() {
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS);

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setPermissions(EMPTY_PERMISSIONS);
      return;
    }
    try {
      const [exact, fullScreen, notifications, battery] = await Promise.all([
        AlarmScheduler.canScheduleExactAlarms(),
        AlarmScheduler.canUseFullScreenIntent(),
        AlarmScheduler.areNotificationsEnabled(),
        AlarmScheduler.isIgnoringBatteryOptimizations(),
      ]);
      setPermissions({ exact, fullScreen, notifications, battery });
    } catch {
      setPermissions(EMPTY_PERMISSIONS);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  async function askForNotifications() {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (status !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Notifications are off', 'An active wake may be harder to identify if notifications are disabled.');
      }
    }
    await refresh();
  }

  function openBatterySettings() {
    Alert.alert(
      'Review battery restrictions',
      'Some Android manufacturers may delay alarms while battery restrictions are active. Choose Dawn Alarm and allow background activity if your device offers that option.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => void AlarmScheduler.openBatteryOptimizationSettings() },
      ],
    );
  }

  const readyCount = Object.values(permissions).filter(Boolean).length;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>DAWN / DEVICE CHECK</Text>
        <Text style={styles.title}>Let morning through.</Text>
        <Text style={styles.subtitle}>Android controls these settings. Check again here after changing one.</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryCount}>{`${readyCount}/4`}</Text>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>{readyCount === 4 ? 'Ready for wake time' : 'A few checks remain'}</Text>
            <Text style={styles.summaryHint}>Permission status is read directly from Android.</Text>
          </View>
        </View>

        <View style={styles.list}>
          <PermissionRow
            number="01"
            title="Exact alarms"
            description="Required for a wake time to fire at its scheduled minute."
            granted={permissions.exact}
            onPress={() => void AlarmScheduler.openExactAlarmSettings()}
          />
          <PermissionRow
            number="02"
            title="Full-screen alarm"
            description="Lets an active wake open over the lock screen when Android allows it."
            granted={permissions.fullScreen}
            onPress={() => void AlarmScheduler.openFullScreenIntentSettings()}
          />
          <PermissionRow
            number="03"
            title="Notifications"
            description="Shows the active wake while its foreground service is running."
            granted={permissions.notifications}
            onPress={() => void askForNotifications()}
          />
          <PermissionRow
            number="04"
            title="Battery restrictions"
            description="Review manufacturer power controls that can delay background work."
            granted={permissions.battery}
            onPress={openBatterySettings}
            grantedLabel="Unrestricted"
            missingLabel="Review"
          />
        </View>

        <Pressable accessibilityRole="button" onPress={() => void refresh()} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
          <Text style={styles.refreshText}>↻  Check again</Text>
        </Pressable>
        <Text style={styles.footer}>A foreground service and timed wake lock keep an active sequence running. Android power policies can still vary by device.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({
  number,
  title,
  description,
  granted,
  onPress,
  grantedLabel = 'Allowed',
  missingLabel = 'Set up',
}: {
  number: string;
  title: string;
  description: string;
  granted: boolean;
  onPress: () => void;
  grantedLabel?: string;
  missingLabel?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.number}>{number}</Text>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <View style={[styles.status, granted && styles.statusGranted]}>
        <Text style={[styles.statusText, granted && styles.statusTextGranted]}>{granted ? grantedLabel : missingLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 30 },
  kicker: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: COLORS.ink, fontFamily: 'serif', fontSize: 37, lineHeight: 44, marginTop: 19 },
  subtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 350 },
  summary: { backgroundColor: COLORS.ink, borderRadius: 7, minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 16, marginTop: 27 },
  summaryCount: { color: '#F1B477', fontFamily: 'serif', fontSize: 32, minWidth: 58 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  summaryHint: { color: '#B6C5B9', fontSize: 11, lineHeight: 16, marginTop: 4 },
  list: { borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 27 },
  row: { minHeight: 94, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.line, gap: 12 },
  number: { color: '#9AA69B', fontSize: 10, fontWeight: '700', width: 22 },
  rowCopy: { flex: 1, paddingVertical: 13 },
  rowTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  rowDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  status: { minWidth: 62, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, backgroundColor: '#F2E3D8', alignItems: 'center' },
  statusGranted: { backgroundColor: '#E1E9DD' },
  statusText: { color: '#96532F', fontSize: 10, fontWeight: '700' },
  statusTextGranted: { color: '#4C8060' },
  refreshButton: { height: 48, borderRadius: 5, borderColor: COLORS.line, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  refreshText: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  footer: { color: COLORS.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 15 },
});
