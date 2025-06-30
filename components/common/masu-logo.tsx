"use client"

import { useTranslation } from "@/lib/translations/i18n"
import Link from "next/link"
import Image from "next/image"

interface MasuLogoProps {
  className?: string
  width?: number
  height?: number
}

export function MasuLogo({ className, width = 120, height = 40 }: MasuLogoProps) {
  const { dir } = useTranslation()

  return (
    <Link
      href="/"
      className={`flex items-center ${dir === "rtl" ? "flex-row-reverse" : ""} ${className || ""}`}
    >
      <Image
        src="/Masu_logo_big.png"
        alt="Masu Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </Link>
  )
}
