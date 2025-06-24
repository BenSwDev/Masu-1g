import { Suspense } from "react"
import { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { ProfessionalEditPage } from "@/components/dashboard/admin/professional-management/professional-edit-page"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { getProfessionalById } from "../actions"
import type { Professional } from "@/lib/types/professional"

// Transform function to convert from MongoDB format to frontend format
function transformProfessionalData(rawProfessional: any): Professional {
  return {
    _id: rawProfessional._id.toString(),
    userId: rawProfessional.userId,
    status: rawProfessional.status,
    isActive: rawProfessional.isActive,
    specialization: rawProfessional.specialization,
    experience: rawProfessional.experience,
    certifications: rawProfessional.certifications,
    bio: rawProfessional.bio,
    profileImage: rawProfessional.profileImage,
    treatments: (rawProfessional.treatments || []).map((t: any) => ({
      treatmentId: t.treatmentId?.toString() || '',
      durationId: t.durationId?.toString(),
      professionalPrice: t.professionalPrice || 0,
      treatmentName: t.treatmentName
    })),
    workAreas: (rawProfessional.workAreas || []).map((w: any) => ({
      cityId: w.cityId?.toString() || '',
      cityName: w.cityName || '',
      distanceRadius: w.distanceRadius,
      coveredCities: w.coveredCities || []
    })),
    totalEarnings: rawProfessional.totalEarnings || 0,
    pendingPayments: rawProfessional.pendingPayments || 0,
    bankDetails: rawProfessional.bankDetails,
    documents: rawProfessional.documents,
    adminNotes: rawProfessional.adminNotes,
    rejectionReason: rawProfessional.rejectionReason,
    appliedAt: rawProfessional.appliedAt,
    approvedAt: rawProfessional.approvedAt,
    rejectedAt: rawProfessional.rejectedAt,
    lastActiveAt: rawProfessional.lastActiveAt,
    createdAt: rawProfessional.createdAt,
    updatedAt: rawProfessional.updatedAt
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const result = await getProfessionalById(params.id)
    if (result.success && result.professional) {
      return {
        title: `עריכת מטפל - ${result.professional.userId.name} | מנהל`,
        description: `עריכת פרטי המטפל ${result.professional.userId.name}`,
      }
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
  }
  
  return {
    title: "עריכת מטפל | מנהל",
    description: "עריכת פרטי מטפל במערכת",
  }
}

function ProfessionalEditLoadingSkeleton() {
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
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

async function ProfessionalEditPageContent({ id }: { id: string }) {
  try {
    const result = await getProfessionalById(id)

    if (!result.success) {
      if (result.error?.includes("לא נמצא") || result.error?.includes("not found")) {
        notFound()
      }
      throw new Error(result.error || "Failed to load professional")
    }

    if (!result.professional) {
      notFound()
    }

    const transformedProfessional = transformProfessionalData(result.professional)
    
    return (
      <ProfessionalEditPage 
        professional={transformedProfessional}
      />
    )
  } catch (error) {
    console.error("Error loading professional:", error)
    throw error
  }
}

export default async function ProfessionalEditPageRoute({ params }: { params: { id: string } }) {
  const session = await requireUserSession()
  
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  if (!params.id || params.id === "new") {
    // Handle new professional creation
    redirect("/dashboard/admin/professional-management/new")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<ProfessionalEditLoadingSkeleton />}>
        <ProfessionalEditPageContent id={params.id} />
      </Suspense>
    </div>
  )
} 