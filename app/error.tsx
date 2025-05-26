"use client"

import { useEffect } from "react"
import { Button } from "@/components/common/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="max-w-md w-full p-6 bg-background rounded-lg shadow-lg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
          <p className="text-muted-foreground">{error.message || "An unexpected error occurred. Please try again."}</p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Go Home
            </Button>
            <Button onClick={() => reset()}>Try Again</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
