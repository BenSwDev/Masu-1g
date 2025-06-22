import Link from "next/link"
import { getTreatments } from "@/actions/treatment-actions"
import { GuestLayout } from "@/components/layout/guest-layout"

export const dynamic = 'force-dynamic'

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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{params.category}</h1>
        <ul className="space-y-4">
          {treatments.map(t => (
            <li key={t._id}>
              <Link href={`/our-treatments/${params.category}/${t._id}`} className="text-lg text-blue-600 hover:underline">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </GuestLayout>
  )
}
