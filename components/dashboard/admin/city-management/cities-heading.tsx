'use client'

import { Heading } from '@/components/ui/heading'
import { MapPin } from 'lucide-react'

export function CitiesHeading() {
  return (
    <Heading icon={MapPin} titleKey="admin.cities.title" descriptionKey="admin.cities.description" />
  )
}
