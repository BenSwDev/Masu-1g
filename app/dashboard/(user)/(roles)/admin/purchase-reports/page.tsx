import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { BarChart3 } from "lucide-react"
import PurchaseReportsClient from "@/components/dashboard/admin/purchase-reports/purchase-reports-client"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"

export const dynamic = 'force-dynamic'

export default async function PurchaseReportsPage() {
  try {
    const session = await requireUserSession()
    if (!session.user.roles?.includes('admin')) {
      redirect("/dashboard")
    }

    return (
      <ScrollArea className="h-full">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <Heading 
              title="דוחות רכישות ומימושים" 
              description="דוח מקיף של כל הרכישות והמימושים במערכת - הזמנות, מנויים ושוברי מתנה"
            />
          </div>
          <Separator />
          <PurchaseReportsClient />
        </div>
      </ScrollArea>
    )
  } catch (error) {
    console.error('Error in purchase reports page:', error)
    return (
      <ScrollArea className="h-full">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            <Heading 
              title="דוחות רכישות ומימושים" 
              description="דוח מקיף של כל הרכישות והמימושים במערכת - הזמנות, מנויים ושוברי מתנה"
            />
          </div>
          <Separator />
          <div className="text-center p-6">
            <p className="text-muted-foreground">שגיאה בטעינת העמוד. נסה לרענן או פנה למנהל המערכת.</p>
          </div>
        </div>
      </ScrollArea>
    )
  }
} 