"use client"

import { MasuLogo } from "@/components/common/masu-logo"
import { LanguageSelector } from "@/components/common/language-selector"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { useSession } from "next-auth/react"
import Link from "next/link"

export function LandingHeader() {
  const { t, dir } = useTranslation()
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <MasuLogo />
          </div>

          {/* Right side actions */}
          <div className={`flex items-center gap-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            {/* Language Selector */}
            <LanguageSelector />
            
            {/* Dashboard/Login Button */}
            {session ? (
              <Button asChild>
                <Link href="/dashboard">
                  {t("common.dashboard")}
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/auth/login">
                  {t("common.login")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 