import Link from "next/link"
import { getTreatmentById } from "@/actions/treatment-actions"
import { GuestLayout } from "@/components/layout/guest-layout"
import { Card } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"

export const dynamic = 'force-dynamic'

export default async function TreatmentPage({ params }: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await params
  const result = await getTreatmentById(id)
  if (!result.success || !result.treatment) {
    return <div className="p-4">Treatment not found</div>
  }
  const t = result.treatment
  return (
    <GuestLayout>
      <Card className="p-6 space-y-4">
        <h1 className="text-3xl font-bold text-center">{t.name}</h1>
        {t.description && <p className="text-gray-700 text-center">{t.description}</p>}
        {t.pricingType === 'fixed' && t.fixedPrice != null && (
          <p className="text-center font-medium">Price: ₪{t.fixedPrice}</p>
        )}
        {t.pricingType === 'duration_based' && Array.isArray(t.durations) && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-center">Durations</h2>
            <ul className="space-y-1">
              {t.durations.map(d => (
                <li key={d._id} className="flex justify-center gap-2">
                  <span>{d.minutes} min</span>
                  <span>- ₪{d.price}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="text-center">
          <Button asChild size="lg" className="mt-4">
            <Link href={`/bookings/treatment?category=${category}&treatmentId=${t._id}`}>Book Now</Link>
          </Button>
        </div>
      </Card>
    </GuestLayout>
  )
}
