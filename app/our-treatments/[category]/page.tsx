import Link from "next/link"
import { getTreatments } from "@/actions/treatment-actions"
import { GuestLayout } from "@/components/layout/guest-layout"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const result = await getTreatments()
  if (!result.success || !result.treatments) {
    return <div className="p-4">Failed to load treatments</div>
  }
  const treatments = result.treatments.filter(t => t.category === params.category)
  if (treatments.length === 0) {
    return <div className="p-4">No treatments found</div>
  }
  return (
    <GuestLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-center capitalize">{params.category}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {treatments.map(t => (
            <Link
              key={t._id}
              href={`/our-treatments/${params.category}/${t._id}`}
              className="block"
            >
              <Card className="p-6 text-center hover:shadow-lg transition-all">
                <span className="font-medium">{t.name}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </GuestLayout>
  )
}
