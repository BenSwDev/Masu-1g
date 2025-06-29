"use client"

import { MasuLogo } from "@/components/common/masu-logo"
import { LanguageSelector } from "@/components/common/language-selector"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"
import { Menu, X, Home, Calendar, CreditCard, Gift, LogOut } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { TreatmentsMenu } from "@/components/common/treatments-menu"

interface GuestLayoutProps {
  children: React.ReactNode
}

export function GuestLayout({ children }: GuestLayoutProps) {
  const { t, dir, language } = useTranslation()
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: t("navigation.home"), href: "/", icon: Home },
    { name: t("navigation.bookTreatment"), href: "/bookings/treatment", icon: Calendar },
    { name: t("navigation.bookSubscription"), href: "/purchase/subscription", icon: CreditCard },
    { name: t("navigation.bookGiftVoucher"), href: "/purchase/gift-voucher", icon: Gift },
  ]

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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and mobile menu toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden"
                aria-label={t("common.openMenu")}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <MasuLogo />
            </div>

            {/* Desktop Navigation */}
            <nav className={cn(
              "hidden md:flex items-center",
              dir === "rtl" ? "space-x-reverse space-x-6" : "space-x-6"
            )}
          >
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      "hover:bg-gray-100 hover:text-gray-900",
                      dir === "rtl" ? "flex-row-reverse" : ""
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
              <TreatmentsMenu />
            </nav>

            {/* Right side actions */}
            <div className={`flex items-center gap-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <LanguageSelector />
              {session ? (
                <>
                  <Button asChild>
                    <Link href="/dashboard">
                      {t("common.dashboard")}
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title={t("common.logout")}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <Link href="/auth/login">
                    {t("common.login")}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t bg-white">
              <nav className="px-2 pt-2 pb-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-base font-medium rounded-md transition-colors",
                        "hover:bg-gray-100 hover:text-gray-900",
                        dir === "rtl" ? "flex-row-reverse" : ""
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
                <TreatmentsMenu mobile onNavigate={() => setIsMobileMenuOpen(false)} />
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className="container mx-auto px-4 py-8 max-w-6xl min-h-full">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-600">{getFooterText()}</div>
        </div>
      </footer>
    </div>
  )
} 
