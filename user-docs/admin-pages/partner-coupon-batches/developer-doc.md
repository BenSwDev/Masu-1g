# קבצים ותלות הדף "קופוני שותפים"

מיקום הדף הראשי: `app/dashboard/(user)/(roles)/admin/partner-coupon-batches/page.tsx`.
העמוד מוגדר כ־`force-dynamic` למניעת חיבור למסד הנתונים בזמן הבנייה.

## רכיבים ופעולות
- `page.tsx` – בודק הרשאות מנהל, קורא ל־`getPartnerCouponBatches` ו־`getPartnersForSelection` ומעביר את התוצאות לרכיב הלקוח.
- `actions.ts` – מכיל את כל פעולות השרת:
  - `getPartnerCouponBatches`
  - `getPartnersForSelection`
  - `createPartnerCouponBatch`
  - `updatePartnerCouponBatch`
  - `deletePartnerCouponBatch`
  - `getBatchCoupons`
  - `updateCouponsInBatch`
- רכיבי צד לקוח בתיקייה `components/dashboard/admin/partner-coupon-batches`:
  - `partner-coupon-batches-client.tsx` – ניהול הרשימה, פתיחת טפסים, מחיקה וצפייה בקופונים.
  - `partner-coupon-batch-form.tsx` – טופס יצירה/עריכה עם ולידציה.
  - `partner-coupon-batch-card.tsx` – כרטיס תצוגה במובייל.
  - `partner-coupon-batches-columns.tsx` – הגדרת עמודות לטבלה ושיוך פעולות.
  - `batch-coupons-modal.tsx` – מודאל לצפייה וניהול קופונים בתוך אצווה.
  - `client-aware-partner-coupon-batches-loading-skeleton.tsx` – שלד טעינה מותאם למובייל.
- מודלי הנתונים: `lib/db/models/partner-coupon-batch.ts` ו־`lib/db/models/coupon.ts`.
- שימוש בעזרים: `requireUserSession`, `authOptions`, `connectDB`, `logger` ו־`@/lib/translations/i18n`.

## זרימת עבודה
1. טעינת הדף בודקת משתמש ומרנדרת את `PartnerCouponBatchesClient` עם הנתונים הראשוניים.
2. המשתמש יכול ליצור אצווה חדשה, לערוך, למחוק או לצפות בקופונים. כל פעולה מפעילה פונקציה מתאימה ב־`actions.ts` ומחזירה תוצאה עם `revalidatePath` לרענון.
3. במודאל הצפייה בקופונים ניתן לבצע פעולות על מספר קופונים יחד (הפעלה/השבתה) דרך `updateCouponsInBatch`.

## תלות טכניות
- React ו־Next.js (app router).
- Mongoose לחיבור למסד הנתונים.
- ספריית `react-hook-form` עם `zod` לבדיקת טפסים.
- UI מבוסס רכיבי ShadCN.
