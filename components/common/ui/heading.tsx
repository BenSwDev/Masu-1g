"use client"

import type React from "react"
import { useTranslation } from "@/lib/translations/i18n"

interface HeadingProps {
  title?: string
  description?: string
  titleKey?: string
  descriptionKey?: string
}

export const Heading: React.FC<HeadingProps> = ({ title, description, titleKey, descriptionKey }) => {
  const { t } = useTranslation()

  const displayTitle = titleKey ? t(titleKey) : title
  const displayDescription = descriptionKey ? t(descriptionKey) : description

  // Ensure title and description are not empty strings before rendering to match original behavior more closely
  // where title and description were required.
  const finalTitle = displayTitle || (titleKey ? "" : title)
  const finalDescription = displayDescription || (descriptionKey ? "" : description)

  return (
    <div>
      {finalTitle && <h2 className="text-3xl font-bold tracking-tight">{finalTitle}</h2>}
      {finalDescription && <p className="text-sm text-muted-foreground">{finalDescription}</p>}
    </div>
  )
}
