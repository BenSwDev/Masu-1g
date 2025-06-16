"use client"

import React, { useState, useEffect, forwardRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useTranslation } from "@/lib/translations/i18n"

interface CitySelectFormProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

interface City {
  _id: string
  name: string
  isActive: boolean
}

export const CitySelectForm = forwardRef<HTMLButtonElement, CitySelectFormProps>(
  ({ value, onValueChange, placeholder, className }, ref) => {
    const { t } = useTranslation()
    const [cities, setCities] = useState<City[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const fetchCities = async () => {
        try {
          const response = await fetch('/api/cities')
          if (response.ok) {
            const data = await response.json()
            setCities(data.cities || [])
          }
        } catch (error) {
          console.error("Error fetching cities:", error)
        } finally {
          setLoading(false)
        }
      }

      fetchCities()
    }, [])

    if (loading) {
      return (
        <Select disabled>
          <SelectTrigger ref={ref} className={className}>
            <SelectValue placeholder="טוען ערים..." />
          </SelectTrigger>
        </Select>
      )
    }

    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger ref={ref} className={className}>
          <SelectValue placeholder={placeholder || "בחר עיר"} />
        </SelectTrigger>
        <SelectContent>
          {cities
            .filter(city => city.isActive)
            .map((city) => (
              <SelectItem key={city._id} value={city.name}>
                {city.name}
              </SelectItem>
            ))
          }
        </SelectContent>
      </Select>
    )
  }
)

CitySelectForm.displayName = "CitySelectForm" 