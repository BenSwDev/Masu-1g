"use client"

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/common/ui/card'
import { useIsMobile } from "@/components/common/ui/use-mobile"
import { Skeleton } from "@/components/common/ui/skeleton"

export function ClientAwareCouponsLoadingSkeleton() {
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: isMobile ? 3 : 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  )
}
