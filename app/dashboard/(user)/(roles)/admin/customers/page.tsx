import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { UserCheck } from "lucide-react"
import CustomersClient from "@/components/dashboard/admin/customers/customers-client"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"

export default async function CustomersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.roles?.includes('admin')) {
    redirect("/dashboard")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading 
          title="ניהול לקוחות" 
          description="סיכום מלא של כל הלקוחות, רכישותיהם ומימושיהם במערכת"
          icon={UserCheck}
        />
        <Separator />
        <CustomersClient />
      </div>
    </ScrollArea>
  )
} 