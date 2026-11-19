// Colour templates. Each one sets the same CSS variables, so every screen
// follows the chosen template. Add a new template here and it shows up in Settings.

export type ThemeId = 'paper' | 'white' | 'stone' | 'sand' | 'graphite' | 'midnight'

export interface Theme {
  name: string
  dark: boolean
  paper: string
  ink: string
  muted: string
  line: string
  card: string
  cardBorder: string
  accent: string
  margin: string
  shadow: string
}

export const THEMES: Record<ThemeId, Theme> = {
  paper: { name: 'Paper', dark: false, paper: '#F4F1EA', ink: '#1C1B19', muted: '#67635B', line: '#E2DDD2', card: '#FFFFFF', cardBorder: '#E6E1D7', accent: '#8C2F2B', margin: 'rgba(140, 47, 43, 0.35)', shadow: 'rgba(28, 27, 25, 0.05)' },
  white: { name: 'White', dark: false, paper: '#FFFFFF', ink: '#161616', muted: '#626262', line: '#EAEAEA', card: '#FAFAFA', cardBorder: '#E7E7E7', accent: '#1F3A93', margin: 'rgba(31, 58, 147, 0.3)', shadow: 'rgba(0, 0, 0, 0.04)' },
  stone: { name: 'Stone', dark: false, paper: '#EDECE9', ink: '#1D1E20', muted: '#5D5F64', line: '#DAD9D5', card: '#F8F8F6', cardBorder: '#DCDBD6', accent: '#2F5D50', margin: 'rgba(47, 93, 80, 0.35)', shadow: 'rgba(0, 0, 0, 0.05)' },
  sand: { name: 'Sand', dark: false, paper: '#F1E9DC', ink: '#241E16', muted: '#635647', line: '#DFD3BF', card: '#FBF7F0', cardBorder: '#E0D4C0', accent: '#9A4E2A', margin: 'rgba(154, 78, 42, 0.35)', shadow: 'rgba(60, 40, 10, 0.06)' },
  graphite: { name: 'Graphite', dark: true, paper: '#161616', ink: '#EDEBE7', muted: '#A29E96', line: '#2A2A2A', card: '#1E1E1E', cardBorder: '#2D2D2D', accent: '#E0B36A', margin: 'rgba(224, 179, 106, 0.35)', shadow: 'rgba(0, 0, 0, 0.35)' },
  midnight: { name: 'Midnight', dark: true, paper: '#10141C', ink: '#E9ECF2', muted: '#9CA5B6', line: '#222A38', card: '#161C27', cardBorder: '#252F41', accent: '#8FB3FF', margin: 'rgba(143, 179, 255, 0.35)', shadow: 'rgba(0, 0, 0, 0.35)' },
}

export function applyTheme(id: ThemeId) {
  const t = THEMES[id] ?? THEMES.paper
  const root = document.documentElement
  root.style.setProperty('--paper', t.paper)
  root.style.setProperty('--ink', t.ink)
  root.style.setProperty('--muted', t.muted)
  root.style.setProperty('--line', t.line)
  root.style.setProperty('--card', t.card)
  root.style.setProperty('--card-border', t.cardBorder)
  root.style.setProperty('--accent', t.accent)
  root.style.setProperty('--margin', t.margin)
  root.style.setProperty('--shadow', t.shadow)
  root.style.colorScheme = t.dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.paper)
}

// Section tab colours stay the same in every template (they are the notebook dividers).
export const TAB_COLORS = {
  today: '#E8E2D4',
  learn: '#D9CFF5',
  ideas: '#CDEFD9',
  notes: '#FFE9A3',
  quotes: '#F8D0C4',
  more: '#DCD7CC',
} as const
