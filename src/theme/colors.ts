export const colors = {
  canvas: '#FFFFFF',
  canvasElevated: '#FAFAFB',
  ink: '#1C1C1E',
  inkSoft: '#3A3A3C',
  muted: '#8E8E93',
  hairline: 'rgba(60, 60, 67, 0.12)',
  fill: 'rgba(120, 120, 128, 0.12)',
  fillStrong: 'rgba(120, 120, 128, 0.2)',
  white: '#FFFFFF',
  black: '#000000',

  // UI accent — black buttons / controls
  accent: '#1C1C1E',
  accentSoft: 'rgba(28, 28, 30, 0.08)',
  me: '#007AFF',
  meSoft: 'rgba(0, 122, 255, 0.1)',
  partner: '#30B0C7',
  partnerSoft: 'rgba(48, 176, 199, 0.12)',
  shared: '#FF375F',
  sharedSoft: 'rgba(255, 55, 95, 0.1)',

  success: '#34C759',
  danger: '#FF3B30',
  shadow: 'rgba(0, 0, 0, 0.08)',

  // legacy aliases used across sheets
  mist: '#F2F2F7',
  mistDeep: '#E5E5EA',
  canvasTop: '#FFFFFF',
  canvasBottom: '#FFFFFF',
  line: 'rgba(60, 60, 67, 0.12)',
  glass: '#FFFFFF',
  glassStrong: '#FFFFFF',
  meDeep: '#0056B3',
  partnerDeep: '#1F7A8A',
  sharedDeep: '#D12B4A',
  sharedGlow: '#FF6B8A',
} as const;

export const eventPalette = {
  me: {
    fill: colors.me,
    soft: colors.meSoft,
    text: colors.white,
    label: 'Yours',
  },
  partner: {
    fill: colors.partner,
    soft: colors.partnerSoft,
    text: colors.white,
    label: 'Thomas',
  },
  shared: {
    fill: colors.shared,
    soft: colors.sharedSoft,
    text: colors.white,
    label: 'Together',
  },
} as const;
