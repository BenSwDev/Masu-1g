import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getProfessionalFinancialSummary } from "@/actions/professional-financial-actions"

export const dynamic = "force-dynamic"

export default async function ProfessionalFinancialPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/auth/login")
  }
  if (session.user.activeRole !== "professional") {
    redirect("/dashboard")
  }

  const result = await getProfessionalFinancialSummary("day")

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">סיכום כספי</h1>
        {result.success ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">תקופה</th>
                <th className="py-2">מס׳ טיפולים</th>
                <th className="py-2">הכנסות מהזמנות</th>
                <th className="py-2">התאמות</th>
                <th className="py-2">סה"כ</th>
              </tr>
            </thead>
            <tbody>
              {result.data?.map(r => (
                <tr key={r.period} className="border-b last:border-0">
                  <td className="py-2">{r.period}</td>
                  <td className="py-2">{r.treatments}</td>
                  <td className="py-2">{r.earnings.toFixed(0)} ₪</td>
                  <td className="py-2">{r.adjustments.toFixed(0)} ₪</td>
                  <td className="py-2 font-semibold">{r.total.toFixed(0)} ₪</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-red-600">שגיאה בטעינת הנתונים</p>
        )}
      </div>
    </div>
  )
}
