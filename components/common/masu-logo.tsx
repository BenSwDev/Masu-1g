"use client"

import { AudioWaveformIcon as WaveformIcon } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import Link from "next/link"

interface MasuLogoProps {
  className?: string
}

export function MasuLogo({ className }: MasuLogoProps) {
  const { dir } = useTranslation()

  return (
    <Link href="/" className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""} ${className || ""}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-turquoise-500 text-white">
        <WaveformIcon className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold text-turquoise-700">Masu</span>
    </Link>
  )
}
