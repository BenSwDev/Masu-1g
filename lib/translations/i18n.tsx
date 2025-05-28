"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type Language, getDirection } from "./server"

// Interface for the translation context
interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  dir: "rtl" | "ltr"
}

// Default context value
const defaultContext: I18nContextType = {
  language: "he",
  setLanguage: () => {},
  t: (key: string) => key,
  dir: "rtl",
}

// Create context
const I18nContext = createContext<I18nContextType>(defaultContext)

// Translations
import heTranslations from "./he.json"
import enTranslations from "./en.json"
import ruTranslations from "./ru.json"

const translations = {
  he: heTranslations,
  en: enTranslations,
  ru: ruTranslations,
}

// Provider component
interface I18nProviderProps {
  children: ReactNode
  defaultLanguage?: Language
}

export const I18nProvider = ({ children, defaultLanguage = "he" }: I18nProviderProps) => {
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const [dir, setDir] = useState<"rtl" | "ltr">(getDirection(defaultLanguage))

  // Update direction when language changes
  useEffect(() => {
    const newDir = getDirection(language)
    setDir(newDir)

    // Update HTML dir and lang attributes
    if (typeof document !== "undefined") {
      document.documentElement.dir = newDir
      document.documentElement.lang = language

      // Add class to body for RTL-specific styles
      if (newDir === "rtl") {
        document.body.classList.add("rtl-active")
      } else {
        document.body.classList.remove("rtl-active")
      }
    }
  }, [language])

  // Translation function
  const t = (key: string): string => {
    const keys = key.split(".")
    let result: any = translations[language]

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

  return <I18nContext.Provider value={{ language, setLanguage, t, dir }}>{children}</I18nContext.Provider>
}

// Hook for using translations
export const useTranslation = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider")
  }
  return context
}

// Hook for using direction only
export const useDirection = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useDirection must be used within an I18nProvider")
  }
  return context.dir
}
