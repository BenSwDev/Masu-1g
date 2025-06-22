import Link from "next/link"
import { getTreatments } from "@/actions/treatment-actions"
import { GuestLayout } from "@/components/layout/guest-layout"

export const dynamic = 'force-dynamic'

export default async function OurTreatmentsPage() {
  const result = await getTreatments()
  if (!result.success || !result.treatments) {
    return <div className="p-4">Failed to load treatments</div>
  }

  const categoriesMap: Record<string, { _id: string; name: string }[]> = {}
  result.treatments.forEach(t => {
    const cat = t.category || 'other'
    if (!categoriesMap[cat]) categoriesMap[cat] = []
    categoriesMap[cat].push({ _id: t._id, name: t.name })
  })

  return (
    <GuestLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Our Treatments</h1>
        <ul className="space-y-4">
          {Object.entries(categoriesMap).map(([cat]) => (
            <li key={cat}>
              <Link href={`/our-treatments/${cat}`} className="text-xl font-semibold text-blue-600 hover:underline">
                {cat}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </GuestLayout>
  )
}
