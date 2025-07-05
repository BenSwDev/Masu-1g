# קבצים ותלות הדף "קופונים"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/coupons/page.tsx` והוא נרנדר באופן דינמי באמצעות Next.js. להלן כל הרכיבים והמודולים הקשורים להפעלתו.

## רכיבים ופעולות
- `page.tsx` – טוען את נתוני הקופונים הראשוניים דרך הפונקציות `getAdminCoupons` ו־`getPartnersForSelection` ומציג את רכיב הלקוח `CouponsClient`.
- `actions.ts` – מכיל פעולות שרת לניהול קופונים:
  - `getAdminCoupons` – החזרת רשימת קופונים עם אפשרות לסינון לפי קוד, סטטוס ושותף.
  - `getPartnersForSelection` – שליפת רשימת שותפים לבחירה בטפסים.
  בנוסף מייצא מהמודול `@/actions/coupon-actions` את הפונקציות `getAllCoupons`, `createCoupon`, `updateCoupon`, `deleteCoupon`, `getCouponById`, `getAssignedPartnerCoupons`.
- רכיבי צד לקוח בנתיב `components/dashboard/admin/coupons/`:
  - `coupons-client.tsx` – מנהל מצב רשימת הקופונים, פתיחת טופס יצירה/עריכה ודיאלוגי מחיקה. משתמש ב־React state וב־`useTranslation` להצגת טקסטים.
  - `coupon-form.tsx` – טופס יצירת/עריכת קופון. מבצע ולידציה בעזרת `react-hook-form` ו־`zod`.
  - `coupon-card.tsx` – הצגת קופון במבנה כרטיס (למובייל) עם תפריט פעולות.
  - `coupon-card-skeleton.tsx` ו־`table-loading-skeleton.tsx` – שלדי טעינה למצבי המתנה.
  - `client-aware-coupons-loading-skeleton.tsx` – שלד טעינה המזהה אם המכשיר נייד ומציג שלדים בהתאם.
  - `coupons-columns.tsx` – מגדיר את עמודות טבלת הקופונים ומרנדר תפריט פעולות לכל שורה.
- מודל הנתונים `lib/db/models/coupon.ts` – מגדיר את סכמת הקופון במונגו־די־בי והגבלות ולידציה.
- מודל `lib/db/models/coupon-usage.ts` – רישום שימושים בקופון (לצרכים עתידיים).
- מודולים נוספים: `@/lib/auth/require-session`, `@/lib/auth/auth`, `@/lib/db/mongoose`, `@/lib/logs/logger`, `@/lib/translations/i18n`.

## זרימת עבודה
1. בעת טעינת הדף מתבצע אימות משתמש דרך `requireUserSession`. אם המשתמש אינו מנהל מתבצע הפניה.
2. הפונקציות `getAdminCoupons` ו־`getPartnersForSelection` שולפות נתונים מהשרת ומועברות ל־`CouponsClient` כ־props.
3. בצד הלקוח, `CouponsClient` מציג את רשימת הקופונים באמצעות `DataTable` או כרטיסים ומאפשר יצירה, עריכה ומחיקה באמצעות קריאות לפעולות השרת המיובאות.
4. לאחר ביצוע פעולה מצליח, מתבצע עדכון רשימה מקומי ורענון נתיב במידת הצורך באמצעות `revalidatePath` מהשרת.

## תלות טכניות
- Next.js עם רנדר דינמי (סימן `dynamic = 'force-dynamic'`).
- React ו־TypeScript לצד הלקוח.
- React Hook Form ו־Zod לוולידציה בטפסים.
- TanStack React Table עבור `DataTable`.
- MongoDB ו־Mongoose לניהול המידע.
