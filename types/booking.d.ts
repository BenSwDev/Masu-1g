// types/booking.d.ts

// ... (שאר הטיפוסים נשארים ללא שינוי)

export interface CalculatedPriceDetails {
  basePrice: number
  surcharges: { description: string; amount: number }[] // תוספות מחיר שתמיד מחושבות
  totalSurchargesAmount: number // סכום כולל של התוספות

  treatmentPriceAfterSubscriptionOrTreatmentVoucher: number // מחיר הטיפול לאחר כיסוי ממנוי/שובר טיפול (יכול להיות 0)

  couponDiscount: number
  voucherAppliedAmount: number // כמה כסף נוצל משובר (כספי או ערך שובר טיפול)

  finalAmount: number // הסכום הסופי לתשלום (כולל תוספות שלא כוסו)

  isBaseTreatmentCoveredBySubscription: boolean
  isBaseTreatmentCoveredByTreatmentVoucher: boolean

  // isFullyCoveredByVoucherOrSubscription יישאר, ויהיה true רק אם finalAmount === 0
  isFullyCoveredByVoucherOrSubscription: boolean

  appliedCouponId?: string
  appliedGiftVoucherId?: string
  redeemedUserSubscriptionId?: string
}

// ... (שאר הטיפוסים נשארים ללא שינוי)
