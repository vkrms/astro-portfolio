import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

// Same storage as the public site (BaseHead + ThemeToggle): `theme` in
// localStorage holds 'light' or 'dark'; no value means follow the system.
const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'system'

type ThemeProviderState = {
  defaultTheme: Theme
  resolvedTheme: ResolvedTheme
  theme: Theme
  setTheme: (theme: Theme) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeProviderState | null>(null)

function readTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme] = useState<Theme>(DEFAULT_THEME)
  const [system, setSystem] = useState<ResolvedTheme>('light')

  // Read client-only values after hydration so the server and client renders match.
  useEffect(() => {
    _setTheme(readTheme())
    setSystem(systemTheme())
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(systemTheme())
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = theme === 'system' ? system : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  const setTheme = (next: Theme) => {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
    _setTheme(next)
  }

  const value = useMemo(
    () => ({
      defaultTheme: DEFAULT_THEME,
      resolvedTheme,
      theme,
      setTheme,
      resetTheme: () => setTheme(DEFAULT_THEME),
    }),
    [theme, resolvedTheme]
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
