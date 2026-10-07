export type RoutePoint = { latitude: number; longitude: number; segmentStart?: boolean };

export function splitRoute(route: RoutePoint[]) {
  const segments: RoutePoint[][] = [];
  for (const point of route) {
    if (!segments.length || point.segmentStart) segments.push([]);
    segments[segments.length - 1].push(point);
  }
  return segments;
}

/** Downsampling must not draw a bridge across an unobserved stretch. */
export function simplifyRoute(route: RoutePoint[], maximum = 250): RoutePoint[] {
  if (route.length <= maximum) return route;
  const interval = (route.length - 1) / (maximum - 1);
  let previousIndex = -1;
  return Array.from({ length: maximum }, (_, index) => {
    const selectedIndex = Math.round(index * interval);
    const interrupted = route.slice(previousIndex + 1, selectedIndex + 1).some((point) => point.segmentStart);
    previousIndex = selectedIndex;
    const point = route[selectedIndex];
    return interrupted ? { ...point, segmentStart: true } : point;
  });
}
