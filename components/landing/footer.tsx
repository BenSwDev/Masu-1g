"use client"

import { useTranslation } from "@/lib/translations/i18n"

export function LandingFooter() {
  const { language } = useTranslation()
  const currentYear = new Date().getFullYear()

  const getFooterText = () => {
    switch (language) {
      case "he":
        return `© ${currentYear} Masu. כל הזכויות שמורות.`
      case "ru":
        return `© ${currentYear} Masu. Все права защищены.`
      default:
        return `© ${currentYear} Masu. All rights reserved.`
    }
  }

  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-gray-600">{getFooterText()}</div>
      </div>
    </footer>
  )
} 