"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="max-w-md w-full p-6 bg-background rounded-lg border">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Dashboard Error</h2>
          <p className="text-muted-foreground text-sm">
            {error.message || "An error occurred while loading the dashboard."}
          </p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              Dashboard Home
            </Button>
            <Button size="sm" onClick={() => reset()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
