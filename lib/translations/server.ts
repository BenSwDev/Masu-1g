// Server-side translation utilities
// This file does NOT have "use client" directive, so it can be used in server components

import heTranslations from "./he.json"
import enTranslations from "./en.json"
import ruTranslations from "./ru.json"

export type Language = "he" | "en" | "ru"

const translations = {
  he: heTranslations,
  en: enTranslations,
  ru: ruTranslations,
}

// Direction based on language
export const getDirection = (lang: Language): "rtl" | "ltr" => {
  return lang === "he" ? "rtl" : "ltr"
}

// Server-compatible translation function
export const getTranslations = (lang: Language = "he") => {
  // Create a translation function that works on the server
  const t = (key: string): string => {
    const keys = key.split(".")
    let result: any = translations[lang]

    for (const k of keys) {
      if (result && result[k]) {
        result = result[k]
      } else {
        // Fallback to key if translation not found
        return key
      }
    }

    return result
  }

  return {
    t,
    dir: getDirection(lang),
    language: lang,
  }
}
