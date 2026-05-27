// 8 semantic tokens — mirrors CSS custom properties in global.css
// Used for runtime dynamic color selection (e.g., theme switching)

export type ThemeColors = {
  readonly bgDefault: string;
  readonly bgElevated: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textInverse: string;
  readonly actionPrimary: string;
  readonly actionSecondary: string;
  readonly stateHighlight: string;
};

export const theme: ThemeColors = {
  bgDefault: '#FDFBF7',
  bgElevated: '#F5F0E8',
  textPrimary: '#1A1612',
  textSecondary: '#5C554D',
  textInverse: '#FDFBF7',
  actionPrimary: '#C45B3A',
  actionSecondary: '#D97B5D',
  stateHighlight: '#7A8450',
} as const;
