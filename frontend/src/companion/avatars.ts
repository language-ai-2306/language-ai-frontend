/**
 * Kid-friendly animal avatars for the patient profile. Each is a real image link
 * (Twemoji SVG on a CDN) stored in patient_detail.avatar_url, with an emoji
 * fallback for offline / CDN failure.
 */
const TW = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

export interface AvatarOption {
  key: string;
  label: string;
  emoji: string;
  url: string;
}

export const PATIENT_AVATARS: AvatarOption[] = [
  { key: 'lion', label: 'Lion', emoji: '🦁', url: `${TW}/1f981.svg` },
  { key: 'elephant', label: 'Elephant', emoji: '🐘', url: `${TW}/1f418.svg` },
  { key: 'monkey', label: 'Monkey', emoji: '🐵', url: `${TW}/1f435.svg` },
  { key: 'panda', label: 'Panda', emoji: '🐼', url: `${TW}/1f43c.svg` },
  { key: 'penguin', label: 'Penguin', emoji: '🐧', url: `${TW}/1f427.svg` },
  { key: 'frog', label: 'Frog', emoji: '🐸', url: `${TW}/1f438.svg` },
  { key: 'owl', label: 'Owl', emoji: '🦉', url: `${TW}/1f989.svg` },
  { key: 'fox', label: 'Fox', emoji: '🦊', url: `${TW}/1f98a.svg` },
  { key: 'turtle', label: 'Turtle', emoji: '🐢', url: `${TW}/1f422.svg` },
  { key: 'parrot', label: 'Parrot', emoji: '🦜', url: `${TW}/1f99c.svg` },
];
