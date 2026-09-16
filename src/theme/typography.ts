import { TextStyle } from 'react-native';

export const fonts = {
  display: 'Poppins_600SemiBold',
  displayRegular: 'Poppins_400Regular',
  body: 'Poppins_400Regular',
  bodyMedium: 'Poppins_500Medium',
  bodyBold: 'Poppins_700Bold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

export const type: Record<string, TextStyle> = {
  hero: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 16,
  },
  micro: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
  },
};
