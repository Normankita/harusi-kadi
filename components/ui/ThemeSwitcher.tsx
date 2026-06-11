'use client';
import { useTheme, type Theme } from '@/lib/theme/ThemeContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const THEMES: { id: Theme; color: string; label: string }[] = [
  { id: 'light', color: '#f5f0e8', label: 'Light' },
  { id: 'dark',  color: '#1e1e2e', label: 'Dark' },
  { id: 'gold',  color: '#b8860b', label: 'Gold' },
  { id: 'forest',color: '#2d5a27', label: 'Forest' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { tr } = useLanguage();

  const labelMap: Record<Theme, string> = {
    light: tr('themeLight'),
    dark: tr('themeDark'),
    gold: tr('themeGold'),
    forest: tr('themeForest'),
  };

  return (
    <div className="flex items-center gap-1.5">
      {THEMES.map(({ id, color }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          title={labelMap[id]}
          className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: theme === id ? '#a0522d' : 'transparent',
            boxShadow: theme === id ? `0 0 0 2px ${color}55` : undefined,
            outline: theme === id ? '2px solid currentColor' : undefined,
            outlineOffset: '2px',
          }}
          aria-label={labelMap[id]}
          aria-pressed={theme === id}
        />
      ))}
    </div>
  );
}
