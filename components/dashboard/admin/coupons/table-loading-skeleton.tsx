"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function TableLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-1/4" /> {/* Corresponds to Create New button area */}
        {/* Add more skeletons here if there are filter controls */}
      </div>
      <Skeleton className="h-12 w-full" /> {/* Corresponds to DataTable header */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" /> // Corresponds to table rows
        ))}
      </div>
      <Skeleton className="h-6 w-1/5 mt-2" /> {/* Corresponds to total count */}
    </div>
  )
}
