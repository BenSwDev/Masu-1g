# קבצים ותלות הדף "הזמנות"
דף הניהול הראשי ממוקם בנתיב `app/dashboard/(user)/(roles)/admin/bookings/page.tsx` והוא נרנדר באופן דינמי.

## רכיבים ופעולות
- `page.tsx` – בדיקת סשן מנהל, טעינת `AdminBookingsClient` ועיטוף ב־`BookingsErrorBoundary`.
- `actions.ts` – מכיל את כל פעולות השרת עבור הזמנות: `getAllBookings`, `getBookingById`, `getBookingInitialData`, `createBooking`, `updateBookingByAdmin`, `assignProfessionalToBooking`, `cancelBooking` ועוד.
- `new/page.tsx` – יצירת הזמנה חדשה באמצעות רכיב `BookingCreatePage` והפונקציה `getBookingInitialData`.
- `[bookingId]/page.tsx` – עריכת הזמנה קיימת דרך `BookingEditPage` והפונקציה `getBookingById`.
- תיקיית `components/dashboard/admin/bookings` – מכילה את רכיבי הצד־לקוח: `admin-bookings-client.tsx`, טבלאות עמודות (`admin-bookings-columns.tsx`), מודלי עריכה מורחבים, שלבי יצירה (`create-steps`), טבלאות העריכה (`tabs`) ועוד.

## זרימת עבודה
1. עם טעינת הדף נבדקת הרשאת המשתמש בעזרת `requireUserSession` ואם אינו מנהל מבוצעת הפניה.
2. הקומפוננטה `AdminBookingsClient` קוראת ל־`getAllBookings` בעזרת React Query ומציגה טבלת הזמנות עם מסננים, חיפוש ופאגינציה.
3. בחירה בהזמנה מובילה לדף העריכה `[bookingId]/page.tsx` שם נטענים הנתונים המלאים דרך `getBookingById` ומוצגים בלשוניות שונות.
4. לחיצה על "הזמנה חדשה" מפנה ל־`new/page.tsx` שמקבל נתוני פתיחה מ־`getBookingInitialData` ומרכיב אשף יצירה בן מספר שלבים.
5. פעולות שמירה, שיוך מטפל וביטול מתבצעות ב־`actions.ts` ומרעננות את הנתיב בעזרת `revalidatePath`.

## תלות טכניות
- React ו־Next.js 13 עם רנדר דינמי.
- ספריית React Query לניהול בקשות צד־לקוח.
- MongoDB דרך מודלי Mongoose (`Booking`, `User`, `Treatment` ועוד).
- מודול אימות משתמשים NextAuth והרכיב `requireUserSession`.
- רכיבי UI מותאמים מ־`@/components/common/ui` ו־`lucide-react` לאייקונים.
