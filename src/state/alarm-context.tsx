import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import type { Alarm } from '@/state/alarm';
import { readAlarms, writeAlarms } from '@/storage/alarms';

type AlarmContextValue = {
  alarms: Alarm[];
  ready: boolean;
  error: string | null;
  saveAlarm: (alarm: Alarm) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
};

const AlarmContext = createContext<AlarmContextValue | null>(null);

export function AlarmProvider({ children }: PropsWithChildren) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readAlarms()
      .then(setAlarms)
      .catch(() => setError('Your alarms could not be loaded.'))
      .finally(() => setReady(true));
  }, []);

  async function commit(nextAlarms: Alarm[]) {
    try {
      await writeAlarms(nextAlarms);
      setAlarms(nextAlarms);
      setError(null);
    } catch {
      setError('Your changes could not be saved. Please try again.');
      throw new Error('Alarm storage failed');
    }
  }

  async function saveAlarm(alarm: Alarm) {
    const nextAlarms = alarms.some((item) => item.id === alarm.id)
      ? alarms.map((item) => (item.id === alarm.id ? alarm : item))
      : [...alarms, alarm];
    await commit(nextAlarms);
  }

  async function deleteAlarm(id: string) {
    await commit(alarms.filter((alarm) => alarm.id !== id));
  }

  async function toggleAlarm(id: string) {
    await commit(
      alarms.map((alarm) => (alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm)),
    );
  }

  return (
    <AlarmContext.Provider value={{ alarms, ready, error, saveAlarm, deleteAlarm, toggleAlarm }}>
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarms() {
  const context = useContext(AlarmContext);
  if (!context) throw new Error('useAlarms must be used inside AlarmProvider');
  return context;
}