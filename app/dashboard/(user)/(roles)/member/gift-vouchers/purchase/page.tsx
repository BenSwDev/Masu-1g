import { requireUserSession } from "@/lib/auth/require-session"
import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import { getPaymentMethods } from "@/actions/payment-method-actions"
import UnifiedGiftVoucherWizard from "@/components/gift-vouchers/unified-gift-voucher-wizard"
import { logger } from "@/lib/logs/logger"

export const dynamic = 'force-dynamic'

export default async function PurchaseGiftVoucherPage() {
  const session = await requireUserSession()
  
  if (!session) {
    return <div>Unauthorized</div>
  }

  try {
    const [treatmentsResult, paymentMethodsResult] = await Promise.all([
      getTreatmentsForSelection(),
      getPaymentMethods()
    ])

    if (!treatmentsResult.success || !paymentMethodsResult.success) {
      logger.error("Failed to load data for voucher purchase", {
        treatmentsError: treatmentsResult.error,
        paymentMethodsError: paymentMethodsResult.error
      })
      
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאה בטעינת הנתונים</h1>
            <p className="text-muted-foreground">אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <UnifiedGiftVoucherWizard
          treatments={treatmentsResult.treatments as any || []}
          initialPaymentMethods={paymentMethodsResult.paymentMethods || []}
          currentUser={session.user}
        />
      </div>
    )
  } catch (error) {
    logger.error("Error in gift voucher purchase page", { error })
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h1>
          <p className="text-muted-foreground">אירעה שגיאה בלתי צפויה. אנא נסה שוב מאוחר יותר.</p>
        </div>
      </div>
    )
  }
}
