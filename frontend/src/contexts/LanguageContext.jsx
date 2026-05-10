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

  const tGovernorate = useCallback((name) => {
    if (!name) return name;
    const govs = translations[lang]?.governorates ?? translations["en"]?.governorates ?? {};
    if (govs[name]) return govs[name];
    const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const key = Object.keys(govs).find(k =>
      k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalized &&
      k.toLowerCase() !== normalized
    );
    if (key) return govs[key];
    return name;
  }, [lang]);

  const dir = lang === "ar-tn" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang === "ar-tn" ? "ar" : lang;
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, tGovernorate, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
