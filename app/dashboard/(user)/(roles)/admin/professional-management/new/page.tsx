import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { ProfessionalEditPage } from "@/components/dashboard/admin/professional-management/professional-edit-page"
import { ProfessionalEditErrorBoundary } from "@/components/dashboard/admin/professional-management/professional-edit-error-boundary"
import type { Professional } from "@/lib/types/professional"
import type { IUser } from "@/lib/db/models/user"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "יצירת מטפל חדש | מנהל",
  description: "יצירת מטפל חדש במערכת",
}

function ProfessionalCreateLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      
      {/* Tabs Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`tab-skeleton-${i}`} className="h-10 w-24" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`content-skeleton-${i}`} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// יצירת אובייקט סטטי חד-פעמי עבור מטפל חדש
const staticDate = new Date('2024-01-01T00:00:00.000Z')

const NEW_PROFESSIONAL_TEMPLATE: Professional = {
  _id: "new",
  userId: {
    _id: "new",
    name: "",
    email: "",
    phone: "",
    gender: "male",
    roles: ["professional"],
    activeRole: "professional",
    isActive: true,
    createdAt: staticDate,
    updatedAt: staticDate
  } as unknown as IUser,
  status: "pending_admin_approval",
  isActive: true,
  specialization: "",
  experience: "",
  certifications: [],
  bio: "",
  profileImage: "",
  treatments: [],
  workAreas: [],
  totalEarnings: 0,
  pendingPayments: 0,
  adminNotes: "",
  rejectionReason: "",
  appliedAt: staticDate,
  approvedAt: undefined,
  rejectedAt: undefined,
  lastActiveAt: staticDate,
  createdAt: staticDate,
  updatedAt: staticDate
}

function ProfessionalCreatePageContent() {
  return (
    <ProfessionalEditPage 
      professional={NEW_PROFESSIONAL_TEMPLATE}
      isCreatingNew={true}
    />
  )
}

export default async function NewProfessionalPage() {
  const session = await requireUserSession()
  
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<ProfessionalCreateLoadingSkeleton />}>
        <ProfessionalEditErrorBoundary>
          <ProfessionalCreatePageContent />
        </ProfessionalEditErrorBoundary>
      </Suspense>
    </div>
  )
} 