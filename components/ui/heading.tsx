"use client"

import type React from "react"
import { useTranslation } from "@/lib/translations/i18n"
import type { LucideIcon } from "lucide-react"

interface HeadingProps {
  title?: string
  description?: string
  titleKey?: string
  descriptionKey?: string
  icon?: LucideIcon
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  description,
  titleKey,
  descriptionKey,
  icon: Icon,
}) => {
  const { t } = useTranslation()

  const displayTitle = titleKey ? t(titleKey) : title
  const displayDescription = descriptionKey ? t(descriptionKey) : description

  // Ensure title and description are not empty strings before rendering to match original behavior more closely
  // where title and description were required.
  const finalTitle = displayTitle || (titleKey ? "" : title)
  const finalDescription = displayDescription || (descriptionKey ? "" : description)

  return (
    <div>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-6 w-6" />}
        {finalTitle && <h2 className="text-3xl font-bold tracking-tight">{finalTitle}</h2>}
      </div>
      {finalDescription && <p className="text-sm text-muted-foreground mt-2">{finalDescription}</p>}
    </div>
  )
}
