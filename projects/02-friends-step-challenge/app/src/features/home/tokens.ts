/** Scoped to the approved Concept B. Other screens retain their existing theme. */
export const homeColors = {
  canvas: '#FFFFFF', ink: '#173342', muted: '#4B606B', blue: '#13B5E8',
  edge: '#087CA5', ice: '#E8F8FF', green: '#317F1B', yellow: '#FFD34E',
  coral: '#F77768', line: '#DCE6EB', panelLine: '#B9E6F5', panelEdge: '#E0F1F6',
};

export const homeDarkColors: typeof homeColors = {
  canvas: '#16242B', ink: '#F5FBFD', muted: '#BDD0D8', blue: '#13B5E8',
  edge: '#71DAF9', ice: '#183946', green: '#B1EE90', yellow: '#FFD34E',
  coral: '#F77768', line: '#405A67', panelLine: '#345767', panelEdge: '#20343E',
};

export const homeMotion = { greeting: 600, progress: 550, goal: 1400, cheer: 420, circle: 180 } as const;
