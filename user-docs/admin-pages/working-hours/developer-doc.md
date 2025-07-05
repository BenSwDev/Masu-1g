# קבצים ותלות הדף "שעות פעילות"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/working-hours/page.tsx` והוא נרנדר באופן דינמי לאחר בדיקת הרשאות עם `requireUserSession`.

## רכיבים ופעולות
- `page.tsx` – מוודא שהמשתמש בעל תפקיד מנהל ומציג את רכיב הלקוח `WorkingHoursClient`.
- `working-hours-client.tsx` – רכיב צד לקוח המנהל את הטפסים והטאבים לשעות קבועות, תאריכים מיוחדים ואירועים מיוחדים. משתמש ב‑React Query, ‏React Hook Form ו‑Zod לאימות.
- `actions.ts` – קובץ פעולות השרת הכולל את הפונקציות:
  - `getWorkingHoursSettings`
  - `updateFixedHours`
  - `updateSpecialDates`
  - `updateSpecialDateEvents`
  - `deleteSpecialDate`
  - `deleteSpecialDateEvent`
  - `getWorkingHours` (קיים למטרות התאמה לאחור)
  - `updateWorkingHours` (בשלב פיתוח)
- מודל הנתונים `lib/db/models/working-hours.ts` – מגדיר את סכמת Mongoose לטבלאות FixedHours, SpecialDate, SpecialDateEvent ו‑WorkingHoursSettings.
- מודולים נלווים: `dbConnect`, `getServerSession`, `logger`, `i18n` לתרגום.

## זרימת עבודה
1. בעת טעינת העמוד מתבצעת בדיקת התחברות והרשאה. משתמש ללא הרשאת Admin מנותב לדשבורד הכללי.
2. בצד הלקוח מתבצעת קריאה ל־`getWorkingHoursSettings` על מנת לקבל את הגדרות השעות.
3. פעולות העדכון (`updateFixedHours`, `updateSpecialDates`, `updateSpecialDateEvents` וכד׳) מבוצעות דרך מוטציות React Query, שמרעננות את הנתונים באמצעות `invalidateQueries` ו‑`revalidatePath` לאחר הצלחה.
4. בכל טאב מוצגים טפסים ורשימות המאפשרים הוספה, עריכה ומחיקה של נתונים.

## תלות טכניות
- React ו‑Next.js (app router)
- React Query לניהול בקשות אסינכרוניות
- React Hook Form יחד עם Zod לאימות טפסים
- MongoDB עם Mongoose
- TypeScript
- רכיבי הממשק מתוך `@/components/common/ui/*`
