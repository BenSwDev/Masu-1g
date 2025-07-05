# קבצים ותלות הדף "שותפים"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/partners/page.tsx` ומוגדר כ־`force-dynamic`.

## רכיבים ופעולות
- **page.tsx** – טוען את `PartnerManagement` ומוודא הרשאת מנהל באמצעות `requireUserSession`. בעת טעינה ראשונית נקרא `getPartners` לקבלת רשימת השותפים.
- **actions.ts** – מכיל את כל פעולות השרת:
  - `getPartners` – אחזור שותפים עם חיפוש ופאגינציה.
  - `getPartnerById` – טעינת פרטי שותף יחיד.
  - `createPartner` – יצירת משתמש ופרופיל שותף חדש. משתמש ב־`createUser` מתוך `users/actions`.
  - `updatePartner` – עדכון פרטי שותף קיים וכן עדכון המשתמש שלו בעזרת `updateUser`.
  - `removePartner` – מחיקת פרופיל ומחיקת המשתמש דרך `deleteUser`.
  - פונקציית `requireAdmin` מבצעת אימות סשן מנהל לפני כל פעולה.
- **components/dashboard/admin/partner-management/**
  - `partner-management.tsx` – רכיב צד לקוח שמציג את טבלת השותפים, חיפוש, פאגינציה ופתיחת הדיאלוגים.
  - `partner-form-dialog.tsx` – דיאלוג יצירה/עריכה עם טופס ולידציה (Zod + React Hook Form).
  - `partner-profile-dialog.tsx` – הצגת פרטי שותף בטאבים.
- **מודלים במסד הנתונים**
  - `lib/db/models/partner-profile.ts` – סכמת Mongoose לפרופיל שותף.
  - `lib/db/models/user.ts` – סכמת משתמשים המאפשרת תפקיד "partner".
- **ספריות עזר** – `dbConnect` לחיבור למסד, `require-session` לאימות התחברות, ורכיבי UI מתוך `components/common/ui`.

## זרימת עבודה
1. העמוד נטען ומאמת סשן מנהל.
2. מתבצעת קריאה ל־`getPartners` לקבלת הנתונים הראשוניים.
3. רכיב `PartnerManagement` מנהל חיפוש, ריענון, דפדוף ופתיחת דיאלוגים.
4. פעולות CRUD נשלחות ל־`actions.ts` ובסיום מבוצע `revalidatePath` לרענון הדף.

## תלות טכניות
- React, Next.js (App Router).
- MongoDB דרך Mongoose.
- React Hook Form ו־Zod לוולידציה בטפסים.
- ספריית `lucide-react` לאייקונים.
