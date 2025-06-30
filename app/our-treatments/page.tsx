import Link from "next/link"
import { getTreatments } from "@/actions/treatment-actions"
import { GuestLayout } from "@/components/layout/guest-layout"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function OurTreatmentsPage() {
  const result = await getTreatments()
  if (!result.success || !result.treatments) {
    return <div className="p-4">Failed to load treatments</div>
  }

  const categoriesMap: Record<string, { _id: string; name: string }[]> = {}
  result.treatments.forEach(t => {
    const cat = t.category || "other"
    if (!categoriesMap[cat]) categoriesMap[cat] = []
    categoriesMap[cat].push({ _id: t._id, name: t.name })
  })

  return (
    <GuestLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-center">Our Treatments</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Object.entries(categoriesMap).map(([cat]) => (
            <Link key={cat} href={`/our-treatments/${cat}`} className="block">
              <Card className="p-6 text-center hover:shadow-lg transition-all">
                <span className="text-lg font-semibold capitalize">{cat}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </GuestLayout>
  )
}
