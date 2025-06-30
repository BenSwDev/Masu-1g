"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  const defaultMessage = t("common.unexpectedError")
  const isServerRenderError = error.message.startsWith(
    "An error occurred in the Server Components render"
  )
  const message = isServerRenderError ? defaultMessage : error.message

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="max-w-md w-full p-6 bg-background rounded-lg shadow-lg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-red-100 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t("common.error")}</h2>
          <p className="text-muted-foreground">
            {message || defaultMessage}
            {error.digest && <span className="block mt-2 text-xs">Error Code: {error.digest}</span>}
          </p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              {t("navigation.home")}
            </Button>
            <Button onClick={() => reset()}>{t("bookings.errors.tryAgain")}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
