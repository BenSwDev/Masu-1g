"use client"

import { MasuLogo } from "@/components/common/masu-logo"
import { LanguageSelector } from "@/components/common/language-selector"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Menu } from "lucide-react"

interface DashboardHeaderProps {
  onSidebarToggle: () => void
}

export function DashboardHeader({ onSidebarToggle }: DashboardHeaderProps) {
  const { dir } = useTranslation()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and sidebar toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSidebarToggle}
              className="md:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <MasuLogo />
          </div>

          {/* Right side actions */}
          <div className={`flex items-center gap-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            {/* Language Selector */}
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  )
}
