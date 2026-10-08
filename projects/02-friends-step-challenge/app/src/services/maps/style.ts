import type { useAppColors } from '@/design-system/use-app-theme';

/** Mapbox Streets vector schema; no Studio style publication required. */
export function walkingMapStyle(colors: ReturnType<typeof useAppColors>, dark: boolean) {
  return JSON.stringify({ version: 8, name: 'Stride Circle walking',
    sources: { streets: { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' } },
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': colors.background } },
      { id: 'parks', type: 'fill', source: 'streets', 'source-layer': 'landuse', filter: ['==', 'class', 'park'], paint: { 'fill-color': dark ? '#253E37' : '#D9EBDD' } },
      { id: 'water', type: 'fill', source: 'streets', 'source-layer': 'water', paint: { 'fill-color': dark ? '#213D50' : '#C6E2EC' } },
      { id: 'buildings', type: 'fill', source: 'streets', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': colors.borderSubtle, 'fill-opacity': 0.7 } },
      { id: 'roads', type: 'line', source: 'streets', 'source-layer': 'road', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': dark ? '#354D58' : '#D4E2E7', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 6] } },
      { id: 'paths', type: 'line', source: 'streets', 'source-layer': 'road', filter: ['in', 'class', 'path', 'pedestrian', 'steps'], paint: { 'line-color': dark ? '#6C8C82' : '#8EAF9B', 'line-width': 2, 'line-dasharray': [2, 2] } },
      { id: 'road-labels', type: 'symbol', source: 'streets', 'source-layer': 'road', minzoom: 13, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['DIN Pro Regular'], 'text-size': 11 }, paint: { 'text-color': colors.muted, 'text-halo-color': colors.background, 'text-halo-width': 1 } },
      { id: 'place-labels', type: 'symbol', source: 'streets', 'source-layer': 'place_label', layout: { 'text-field': ['get', 'name'], 'text-font': ['DIN Pro Regular'], 'text-size': 13 }, paint: { 'text-color': colors.ink, 'text-halo-color': colors.background, 'text-halo-width': 1.5 } },
    ] });
}
