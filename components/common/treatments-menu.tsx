"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslation } from "@/lib/translations/i18n"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent
} from "@/components/ui/navigation-menu"

interface CategoryData {
  name: string
  treatments: { _id: string; name: string }[]
}

interface TreatmentsMenuProps {
  mobile?: boolean
  onNavigate?: () => void
}

export function TreatmentsMenu({ mobile = false, onNavigate }: TreatmentsMenuProps) {
  const { t, dir } = useTranslation()
  const [categories, setCategories] = useState<CategoryData[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/treatments')
        const _data = await res.json()
        const map: Record<string, { _id: string; name: string }[]> = {}
        ;(_data.treatments || []).forEach((tr: any) => {
          const c = tr.category || 'other'
          if (!map[c]) map[c] = []
          map[c].push({ _id: tr._id, name: tr.name })
        })
        setCategories(Object.entries(map).map(([name, treatments]) => ({ name, treatments })))
      } catch (err) {
        console.error('Failed to load treatments', err)
      }
    }
    load()
  }, [])

  if (categories.length === 0) return null

  if (mobile) {
    return (
      <div className="space-y-2" dir={dir}>
        <div className="px-3 py-2 font-semibold text-gray-700">
          {t('navigation.ourTreatments')}
        </div>
        {categories.map(cat => (
          <div key={cat.name} className="pl-4 space-y-1">
            <Link href={`/our-treatments/${cat.name}`} onClick={onNavigate} className="font-medium text-gray-700 hover:text-gray-900">
              {t(`treatments.categories.${cat.name}`)}
            </Link>
            <div className="pl-4 space-y-1">
              {cat.treatments.map(tr => (
                <Link
                  key={tr._id}
                  href={`/our-treatments/${cat.name}/${tr._id}`}
                  className="block text-sm text-gray-600 hover:text-gray-900"
                  onClick={onNavigate}
                >
                  {tr.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <NavigationMenu dir={dir}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent hover:bg-gray-100">
            {t('navigation.ourTreatments')}
          </NavigationMenuTrigger>
          <NavigationMenuContent className="p-4 bg-white shadow" dir={dir}>
            <div className="grid gap-4">
              {categories.map(cat => (
                <div key={cat.name}>
                  <Link href={`/our-treatments/${cat.name}`} className="font-medium hover:underline" onClick={onNavigate}>
                    {t(`treatments.categories.${cat.name}`)}
                  </Link>
                  <ul className="pl-4 mt-1 space-y-1">
                    {cat.treatments.map(tr => (
                      <li key={tr._id}>
                        <Link
                          href={`/our-treatments/${cat.name}/${tr._id}`}
                          className="text-sm hover:underline"
                          onClick={onNavigate}
                        >
                          {tr.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
