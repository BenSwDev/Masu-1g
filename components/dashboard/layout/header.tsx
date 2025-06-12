"use client"

import { MasuLogo } from "@/components/common/masu-logo"
import { LanguageSelector } from "@/components/common/language-selector"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Menu, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"

interface DashboardHeaderProps {
  onSidebarToggle: () => void
}

export function DashboardHeader({ onSidebarToggle }: DashboardHeaderProps) {
  const { t, dir } = useTranslation()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

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
              aria-label={t("common.openMenu")}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <MasuLogo />
          </div>

          {/* Right side actions */}
          <div className={`flex items-center gap-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            {/* Dashboard Button */}
            <Button asChild variant="outline">
              <Link href="/dashboard">
                {t("common.dashboard")}
              </Link>
            </Button>
            
            {/* Language Selector */}
            <LanguageSelector />
            
            {/* Logout Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title={t("common.logout")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
