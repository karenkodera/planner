export const colors = {
  mist: '#E8ECE7',
  mistDeep: '#D8E0D6',
  canvasTop: '#F4F1EC',
  canvasBottom: '#E3E9E4',
  ink: '#1B2420',
  inkSoft: '#3A4540',
  muted: '#6E7872',
  line: 'rgba(27, 36, 32, 0.08)',
  glass: 'rgba(255, 255, 255, 0.72)',
  glassStrong: 'rgba(255, 255, 255, 0.88)',
  white: '#FFFFFF',

  me: '#C45C4A',
  meSoft: '#F3D5CF',
  meDeep: '#9E4335',

  partner: '#5F7D6B',
  partnerSoft: '#D5E2DA',
  partnerDeep: '#3F5A4B',

  shared: '#C9923A',
  sharedSoft: '#F3E4C4',
  sharedDeep: '#9A6C1F',
  sharedGlow: '#E8B86A',

  success: '#4F7A5A',
  danger: '#B24A3C',
  shadow: 'rgba(27, 36, 32, 0.12)',
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
    label: 'Alex',
  },
  shared: {
    fill: colors.shared,
    soft: colors.sharedSoft,
    text: colors.ink,
    label: 'Together',
  },
} as const;
