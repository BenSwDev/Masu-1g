import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/common/theme-provider"
import { I18nProvider } from "@/lib/translations/i18n"
import { AuthProvider } from "@/components/auth/providers/auth-provider"
import { Toaster } from "@/components/common/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Masu",
  description: "Masu Application",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Default language is Hebrew so set dir="rtl" from the server to prevent an initial LTR flash
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <I18nProvider defaultLanguage="he">{children}</I18nProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
