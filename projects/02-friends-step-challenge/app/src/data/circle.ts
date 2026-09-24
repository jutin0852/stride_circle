import type { AvatarChoice } from '@/lib/avatar';

export type Friend = {
  avatar?: AvatarChoice;
  id?: string;
  name: string;
  initials: string;
  steps: number;
  color: string;
  isYou?: boolean;
};

export type DayResult = {
  label: string;
  date: string;
  winner: string;
  standings: Friend[];
};

export const friends: Friend[] = [
  { name: 'Ada', initials: 'AO', steps: 7982, color: '#31377D' },
  { name: 'You', initials: 'JU', steps: 6842, color: '#F05C3B', isYou: true },
  { name: 'Tobi', initials: 'TO', steps: 6210, color: '#0E918C' },
  { name: 'Zainab', initials: 'ZA', steps: 5903, color: '#D18C34' },
  { name: 'Kelechi', initials: 'KE', steps: 4408, color: '#825EA9' },
  { name: 'Mariam', initials: 'MA', steps: 3891, color: '#C64B72' },
];

export const week: DayResult[] = [
  { label: 'Mon', date: 'Sep 15', winner: 'Ada', standings: [{ ...friends[0], steps: 7404 }, { ...friends[1], steps: 5310 }, { ...friends[2], steps: 4881 }, { ...friends[3], steps: 4500 }] },
  { label: 'Tue', date: 'Sep 16', winner: 'You', standings: [{ ...friends[1], steps: 6248 }, { ...friends[2], steps: 6011 }, { ...friends[0], steps: 5760 }, { ...friends[3], steps: 4932 }] },
  { label: 'Wed', date: 'Sep 17', winner: 'Tobi', standings: [{ ...friends[2], steps: 8220 }, { ...friends[1], steps: 7399 }, { ...friends[0], steps: 6920 }, { ...friends[5], steps: 5004 }] },
  { label: 'Thu', date: 'Sep 18', winner: 'You', standings: [{ ...friends[1], steps: 9124 }, { ...friends[0], steps: 9001 }, { ...friends[3], steps: 7684 }, { ...friends[2], steps: 7092 }] },
  { label: 'Fri', date: 'Sep 19', winner: 'Ada', standings: [{ ...friends[0], steps: 8100 }, { ...friends[1], steps: 6803 }, { ...friends[4], steps: 6440 }, { ...friends[2], steps: 6000 }] },
];

export const formatSteps = (steps: number) => steps.toLocaleString('en-US');
