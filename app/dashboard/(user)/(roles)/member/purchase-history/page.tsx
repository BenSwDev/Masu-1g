import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import PurchaseHistoryClient from "@/components/dashboard/member/purchase-history/purchase-history-client"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"

export default async function PurchaseHistoryPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/login")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading 
          title="היסטוריית רכישות ומימושים" 
          description="צפה בכל הרכישות והמימושים שלך - הזמנות, מנויים ושוברי מתנה" 
        />
        <Separator />
        <PurchaseHistoryClient />
      </div>
    </ScrollArea>
  )
} 