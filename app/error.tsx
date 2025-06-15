"use client"

import { useEffect } from "react"
import { Button } from "@/components/common/ui/button"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { logger } from "@/lib/logs/logger"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to the logging service
    logger.error("Application error boundary triggered", {
      error: {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 10), // First 10 lines of stack
        digest: error.digest
      }
    })
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
            <Button variant="outline" onClick={() => router.push("/")}>Go Home</Button>
            <Button onClick={() => reset()}>Try Again</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
