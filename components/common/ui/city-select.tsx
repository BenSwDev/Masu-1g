"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
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
      {/* Hidden input for form submission */}
      {name && (
        <input 
          type="hidden" 
          name={name} 
          value={selectedValue}
        />
      )}
    </>
  )
} 