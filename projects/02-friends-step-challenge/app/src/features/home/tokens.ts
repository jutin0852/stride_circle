import { appColors } from '@/design-system/tokens';

/** The Home palette is the canonical app palette. */
export const homeColors = appColors;

export const homeDarkColors: Record<keyof typeof homeColors, string> = {
  canvas: '#16242B', ink: '#F5FBFD', muted: '#BDD0D8', blue: '#13B5E8',
  edge: '#71DAF9', ice: '#183946', green: '#B1EE90', yellow: '#FFD34E',
  coral: '#F77768', line: '#405A67', panelLine: '#345767', panelEdge: '#20343E',
};

export const homeMotion = { greeting: 600, progress: 550, goal: 1400, cheer: 420, circle: 180 } as const;
