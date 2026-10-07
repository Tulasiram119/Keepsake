export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  secondary: string;
  secondarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
}

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#FBF6EE',
    surface: '#FFFBF5',
    surfaceAlt: '#F5EDE1',
    primary: '#C8553D',
    primarySoft: '#F6E1D9',
    onPrimary: '#FFFBF5',
    secondary: '#E0A458',
    secondarySoft: '#F8EAD3',
    accent: '#D98880',
    accentSoft: '#F7E3E0',
    success: '#6F8A5B',
    successSoft: '#E7EDDF',
    warning: '#A9652A',
    warningSoft: '#F8EAD3',
    text: '#3B2F2A',
    textSecondary: '#7A6A60',
    border: '#E8DCCB',
    shadow: '#6B4A35',
  },
  dark: {
    background: '#1F1814',
    surface: '#2A211C',
    surfaceAlt: '#352A23',
    primary: '#E07A5F',
    primarySoft: '#4A2E25',
    onPrimary: '#1F1814',
    secondary: '#E9B872',
    secondarySoft: '#43362A',
    accent: '#D9958F',
    accentSoft: '#45302D',
    success: '#A3B88F',
    successSoft: '#2F3528',
    warning: '#E9B872',
    warningSoft: '#43362A',
    text: '#F2E8DC',
    textSecondary: '#B5A495',
    border: '#3D312A',
    shadow: '#000000',
  },
};
