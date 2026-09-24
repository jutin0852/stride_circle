/** Character choices are generated from an opaque seed, never an email address. */
export const avatarStyles = [
  { id: 'cameo', label: 'Cameo' },
  { id: 'clay', label: 'Clay' },
  { id: 'critters', label: 'Critters' },
  { id: 'cutouts', label: 'Cutouts' },
  { id: 'gaze', label: 'Gaze' },
  { id: 'line-face', label: 'Line face' },
  { id: 'lorelei', label: 'Lorelei' },
  { id: 'lorelei-neutral', label: 'Lorelei neutral' },
  { id: 'marbles', label: 'Marbles' },
  { id: 'moods', label: 'Moods' },
  { id: 'notionists', label: 'Notionists' },
  { id: 'notionists-neutral', label: 'Notionists neutral' },
  { id: 'open-peeps', label: 'Open Peeps' },
  { id: 'pixel-art', label: 'Pixel art' },
  { id: 'pixel-art-neutral', label: 'Pixel art neutral' },
  { id: 'pixelbot', label: 'Pixel bot' },
  { id: 'shadows', label: 'Shadows' },
  { id: 'sprouts', label: 'Sprouts' },
  { id: 'thumbs', label: 'Thumbs' },
  { id: 'voxel-art', label: 'Voxel art' },
  { id: 'voxel-bot', label: 'Voxel bot' },
] as const;

export type AvatarStyle = (typeof avatarStyles)[number]['id'];

export type AvatarChoice = {
  seed: string;
  style: AvatarStyle;
};

export const avatarGroups = [
  { title: 'Faces', styles: ['cameo', 'gaze', 'line-face', 'lorelei', 'lorelei-neutral', 'notionists', 'notionists-neutral', 'open-peeps'] },
  { title: 'Playful', styles: ['clay', 'critters', 'cutouts', 'moods', 'sprouts', 'thumbs'] },
  { title: 'Pixel & bots', styles: ['pixel-art', 'pixel-art-neutral', 'pixelbot', 'voxel-art', 'voxel-bot'] },
  { title: 'Abstract', styles: ['marbles', 'shadows'] },
] as const satisfies readonly { title: string; styles: readonly AvatarStyle[] }[];

function hash(value: string) {
  return Array.from(value).reduce((result, character) => ((result << 5) - result + character.charCodeAt(0)) | 0, 0);
}

export function isAvatarStyle(value: unknown): value is AvatarStyle {
  return typeof value === 'string' && avatarStyles.some((style) => style.id === value);
}

export function getDefaultAvatarChoice(userId: string): AvatarChoice {
  const index = Math.abs(hash(userId)) % avatarStyles.length;
  return { seed: `stride-${userId}`, style: avatarStyles[index].id };
}

export function createAvatarSeed() {
  return `stride-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getAvatarUrl(choice: AvatarChoice) {
  return `https://api.dicebear.com/10.x/${choice.style}/svg?seed=${encodeURIComponent(choice.seed)}&size=128`;
}

export function getAvatarChoiceFromUrl(url: string | null | undefined): AvatarChoice | null {
  if (!url) return null;

  const match = url.match(/^https:\/\/api\.dicebear\.com\/10\.x\/([^/]+)\/svg\?(.+)$/);
  if (!match || !isAvatarStyle(match[1])) return null;

  const seed = new URLSearchParams(match[2]).get('seed');
  return seed ? { seed, style: match[1] } : null;
}
