import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import en from "../i18n/en";
import fr from "../i18n/fr";
import arTn from "../i18n/ar-tn";

const translations = { en, fr, "ar-tn": arTn };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("lang") || "en");

  const setLanguage = useCallback((l) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
  }, [lang]);

  const dir = lang === "ar-tn" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang === "ar-tn" ? "ar" : lang;
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
