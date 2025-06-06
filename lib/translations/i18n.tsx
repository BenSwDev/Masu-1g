"use client"

// Extend the Window interface for development-time debugging
declare global {
  interface Window {
    getMissingTranslations?: () => void
  }
}

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// A Set to store missing translation keys across the application session.
// Using a Set automatically handles duplicates.
const missingKeys = new Set<string>()

// Supported languages
export type Language = "he" | "en" | "ru"

// Direction based on language
export const getDirection = (lang: Language): "rtl" | "ltr" => {
  return lang === "he" ? "rtl" : "ltr"
}

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

  // In development mode, expose a global function to get and copy missing keys.
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      window.getMissingTranslations = () => {
        if (missingKeys.size === 0) {
          console.log("[i18n] No missing translation keys found.")
          return
        }

        const keys = Array.from(missingKeys).join("\n")
        console.log("----- Missing Translation Keys -----")
        console.log(keys)
        console.log("------------------------------------")

        navigator.clipboard
          .writeText(keys)
          .then(() => {
            console.log("[i18n] Missing keys copied to clipboard!")
          })
          .catch((err) => {
            console.error("[i18n] Failed to copy missing keys: ", err)
          })
      }
    }

    // Cleanup the global function when the component unmounts.
    return () => {
      if (window.getMissingTranslations) {
        delete window.getMissingTranslations
      }
    }
  }, []) // Empty dependency array ensures this runs only once.

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
    let current: any = translations[language]
    let pathTraversed = "" // To keep track of the path being traversed for better error messages
    let keyFound = true

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      pathTraversed += (i > 0 ? "." : "") + k // Build the path as we go

      if (current && typeof current === "object" && k in current) {
        current = current[k]
      } else {
        // Part of the key path was not found
        keyFound = false
        break
      }
    }

    // After the loop, if the key was not fully found or if the final result is not a string
    // (meaning the key might be a prefix to a deeper object, not a leaf translation string)
    if (!keyFound || typeof current !== "string") {
      if (process.env.NODE_ENV === "development") {
        missingKeys.add(key)
      }
      return key // Fallback to the original key
    }

    return current
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
