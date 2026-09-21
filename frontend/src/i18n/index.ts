import { createContext, useContext, useState, ReactNode } from 'react';
import en from './en';
import fa from './fa';

type Lang = 'en' | 'fa';
const translations = { en, fa } as const;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof en) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('hardino_lang') as Lang) || 'en';
  });

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('hardino_lang', l);
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  const t = (key: keyof typeof en): string => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
