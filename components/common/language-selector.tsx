"use client"

import { useTranslation, type Language } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/common/ui/dropdown-menu"
import { Globe } from "lucide-react"

export function LanguageSelector() {
  const { language, setLanguage, t, dir } = useTranslation()

  const languages: { code: Language; name: string }[] = [
    { code: "he", name: "עברית" },
    { code: "en", name: "English" },
    { code: "ru", name: "Русский" },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t("login.languageSelector")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className={dir === "rtl" ? "rtl-dropdown" : ""}>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`${language === lang.code ? "bg-accent font-medium" : ""} ${dir === "rtl" ? "text-right w-full" : ""}`}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
