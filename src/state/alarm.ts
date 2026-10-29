export type Alarm = {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  repeatDays: number[];
};

export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function getRepeatLabel(repeatDays: number[]) {
  if (repeatDays.length === 0) return 'Once';
  if (repeatDays.length === 7) return 'Every day';
  if (repeatDays.length === 5 && [1, 2, 3, 4, 5].every((day) => repeatDays.includes(day))) return 'Weekdays';
  if (repeatDays.length === 2 && [0, 6].every((day) => repeatDays.includes(day))) return 'Weekends';
  return repeatDays.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ');
}