# קבצים ותלות הדף "טיפולים"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/treatments/page.tsx` והוא נרנדר באופן דינמי. הקומפוננטות והמודולים הבאים משתתפים בהפעלתו:

## רכיבים ופעולות
- `page.tsx` – מגדיר את מבנה העמוד, טוען את כרטיסי הסטטיסטיקה (`TreatmentStatsCards`) ואת רכיב הלקוח `TreatmentsClient`.
- `actions.ts` – כולל את כל פעולות השרת: `getAllTreatments`, `getTreatmentById`, `createTreatment`, `updateTreatment`, `deleteTreatment`, `toggleTreatmentStatus`, `duplicateTreatment`, ו־`getTreatmentStats`. כל פעולה מבצעת אימות הרשאות באמצעות `requireAdminAuth` ומתחברת למסד הנתונים באמצעות `dbConnect`.
- `components/dashboard/admin/treatments/treatments-client.tsx` – רכיב צד לקוח המנהל את מצבי המסננים, הטעינה והפאגינציה. משתמש ב־React Query לשיחות אל `actions.ts` ומפעיל דיאלוגי יצירה, עריכה וצפייה.
- `treatment-create-dialog.tsx` ו־`treatment-edit-dialog.tsx` – חלונות קופצים עם טפסים המבצעים ולידציה באמצעות Zod ולאחר מכן קוראים לפעולות השרת המתאימות.
- `treatment-view-dialog.tsx` – מציג את פרטי הטיפול בלבד.
- `treatment-card.tsx` ו־`treatment-form.tsx` – רכיבי משנה המשמשים להצגת כרטיסים או טפסי עריכה פנימיים במידת הצורך.
- מודל הנתונים `lib/db/models/treatment.ts` – מגדיר את סכמת Mongoose, שדות טיפול והגבלות ולידציה, כולל hook לפני שמירה.
- מודולי עזר נוספים: `@/lib/auth/require-session`, `@/lib/auth/auth`, `@/lib/db/mongoose`, `@/lib/logs/logger`, ו־`@/lib/translations/i18n`.

## זרימת עבודה
1. טעינת הדף מבצעת בדיקת התחברות וקריאה ל־`getTreatmentStats` להצגת נתונים כלליים.
2. `TreatmentsClient` שולף את הרשימה עם `getAllTreatments` ומגיב לשינויים במסננים, מיון ופאגינציה.
3. פעולות יצירה, עדכון, מחיקה, שכפול ושינוי סטטוס מפעילות את הפונקציות המתאימות ב־`actions.ts`. לאחר כל פעולה מבוצע `revalidatePath` כדי לרענן את הנתונים.

רכיבים ופעולות אלו תלויים זה בזה לצורך הצגת ניהול הטיפולים באופן מלא. שינוי באחד הקבצים משפיע ישירות על התנהגות הדף או על הנתונים המתקבלים מהשרת.
