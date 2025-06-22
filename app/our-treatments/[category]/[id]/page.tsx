import Link from "next/link"
import { getTreatmentById } from "@/actions/treatment-actions"
import { GuestLayout } from "@/components/layout/guest-layout"

export const dynamic = 'force-dynamic'

export default async function TreatmentPage({ params }: { params: { category: string; id: string } }) {
  const result = await getTreatmentById(params.id)
  if (!result.success || !result.treatment) {
    return <div className="p-4">Treatment not found</div>
  }
  const t = result.treatment
  return (
    <GuestLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t.name}</h1>
        {t.description && <p>{t.description}</p>}
        {t.pricingType === 'fixed' && t.fixedPrice != null && (
          <p>Price: ₪{t.fixedPrice}</p>
        )}
        {t.pricingType === 'duration_based' && Array.isArray(t.durations) && (
          <div>
            <h2 className="text-xl font-semibold">Durations</h2>
            <ul className="list-disc pl-5">
              {t.durations.map(d => (
                <li key={d._id}>
                  {d.minutes} min - ₪{d.price}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href={`/bookings/treatment?category=${params.category}&treatmentId=${t._id}`} className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Book Now
        </Link>
      </div>
    </GuestLayout>
  )
}
