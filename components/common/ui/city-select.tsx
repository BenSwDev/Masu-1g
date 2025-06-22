"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { useTranslation } from "@/lib/translations/i18n"

interface CitySelectProps {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  name?: string
  id?: string
  required?: boolean
  className?: string
  placeholder?: string
}

interface City {
  _id: string
  name: string
  isActive: boolean
}

export function CitySelect({ 
  value, 
  onValueChange, 
  defaultValue, 
  name, 
  id, 
  required, 
  className,
  placeholder 
}: CitySelectProps) {
  const { t } = useTranslation()
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || "")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('/api/cities')
        if (response.ok) {
          const data = await response.json()
          const sorted = (data.cities || []).sort((a: City, b: City) =>
            a.name.localeCompare(b.name)
          )
          setCities(sorted)
        }
      } catch (error) {
        console.error("Error fetching cities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [])

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
  }

  if (loading) {
    return (
      <Input 
        disabled 
        placeholder="טוען ערים..." 
        className={className}
      />
    )
  }

  const filteredCities = cities
    .filter((city) =>
      city.isActive && city.name.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <>
      <Select
        value={selectedValue}
        onValueChange={handleValueChange}
        required={required}
      >
        <SelectTrigger id={id} className={className}>
          <SelectValue placeholder={placeholder || "בחר עיר"} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={t("admin.cities.searchPlaceholder")}
            />
          </div>
          {filteredCities.map((city) => (
            <SelectItem key={city._id} value={city.name}>
              {city.name}
            </SelectItem>
          ))}
          {filteredCities.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground">
              {t("admin.cities.noCitiesFound")}
            </div>
          )}
        </SelectContent>
      </Select>
      {name && (
        <input type="hidden" name={name} value={selectedValue} />
      )}
    </>
  )
}
