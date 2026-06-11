'use client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'sw' ? 'en' : 'sw')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-ui-border bg-ui-card text-ui-text hover:bg-ui-accent/10 transition-colors"
      title={language === 'sw' ? 'Switch to English' : 'Badili kwa Kiswahili'}
    >
      <span>{language === 'sw' ? '🇹🇿' : '🇬🇧'}</span>
      <span>{language === 'sw' ? 'Kiswahili' : 'English'}</span>
      <span className="text-ui-muted">⇄</span>
      <span>{language === 'sw' ? '🇬🇧' : '🇹🇿'}</span>
    </button>
  );
}
