import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './en';
import fa from './fa';

type Lang = 'en' | 'fa';
type Theme = 'dark' | 'light';
const translations = { en, fa } as const;

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en) => string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('hardino_lang') as Lang) || 'en';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('hardino_theme') as Theme) || 'dark';
  });

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('hardino_lang', l);
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  const handleSetTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem('hardino_theme', t);
    if (t === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  const toggleTheme = () => {
    handleSetTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    handleSetTheme(theme);
  }, []);

  const t = (key: keyof typeof en): string => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <AppContext.Provider value={{ lang, setLang: handleSetLang, t, theme, setTheme: handleSetTheme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useLang() {
  return useContext(AppContext);
}
