import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, AlertCircle, Navigation } from "lucide-react"
import ProfessionalResponseClient from "./professional-response-client"

interface PageProps {
  params: Promise<{
    responseId: string
  }>
  searchParams: Promise<{
    action?: "accept" | "decline"
  }>
}

export default async function ProfessionalResponsePage({ params, searchParams }: PageProps) {
  const { responseId } = await params
  const { action } = await searchParams

  if (!responseId) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">מאסו - מערכת ניהול הזמנות</h1>
          <p className="text-gray-600 mt-2">תגובה להזמנת טיפול</p>
        </div>
        
        <Suspense fallback={
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </CardContent>
          </Card>
        }>
          <ProfessionalResponseClient responseId={responseId} action={action} />
        </Suspense>
      </div>
    </div>
  )
} 