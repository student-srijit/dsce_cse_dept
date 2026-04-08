"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type SupportedLanguage = "en" | "hi" | "ta" | "te" | "kn";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (nextLanguage: SupportedLanguage) => void;
}

const LANGUAGE_STORAGE_KEY = "gramcredit.ui.language";

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(
      LANGUAGE_STORAGE_KEY,
    ) as SupportedLanguage | null;
    if (stored && ["en", "hi", "ta", "te", "kn"].includes(stored)) {
      setLanguage(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const updateLanguage = (nextLanguage: SupportedLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  };

  const value = useMemo(
    () => ({ language, setLanguage: updateLanguage }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
