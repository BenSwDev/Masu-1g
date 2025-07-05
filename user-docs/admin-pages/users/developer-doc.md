# קבצים ותלות הדף "משתמשים"

דף הניהול ממוקם בנתיב `app/dashboard/(user)/(roles)/admin/users/page.tsx` ומטופל ברינדור דינמי. הוא מבוסס על מספר קבצים ורכיבים התלויים זה בזה:

## רכיבים ופעולות
- `page.tsx` – מבצע בדיקת הרשאות דרך `requireUserSession`, טוען נתוני סטטיסטיקה עם `getUserStats` ומעביר ללקוח את התוצאות הראשוניות (`getAllUsers`).
- `actions.ts` – מכיל את כל פעולות השרת: `getAllUsers`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, `permanentlyDeleteUser`, `resetUserPassword`, `toggleUserRole`, `toggleUserStatus` ו־`getUserStats`. כל פעולה משתמשת ב־`requireAdminAuth` ומתחברת למסד הנתונים באמצעות `dbConnect`.
- `user-management-client.tsx` – רכיב צד לקוח המנהל את המסננים, הטעינה והפאגינציה. מפעיל דיאלוגי יצירה ועריכה ומבצע קריאות לפעולות השרת.
- `user-create-dialog.tsx` ו־`user-edit-dialog.tsx` – חלונות קופצים עם טפסים המאמתים נתונים באמצעות Zod ולאחר מכן קוראים לפעולות המתאימות.
- מודל הנתונים `lib/db/models/user.ts` – מגדיר את סכמת המשתמש במונגו־די־בי כולל שדות, תפקידים, העדפות ואינדקסים.
- רכיבי עזר נוספים: `PhoneInput`, מרכיבי UI שונים ו־`QueryProvider` בלייאאוט הכללי.

## זרימת עבודה
1. בעת טעינת העמוד מתבצעת בדיקה שהמשתמש מחובר ומוגדר כמנהל.
2. במקביל נטענות סטטיסטיקות כלליות באמצעות `getUserStats`.
3. `UserManagementClient` מקבל את רשימת המשתמשים הראשונית ומאפשר שינוי מסננים, דפדוף והפעלה של דיאלוגי יצירה או עריכה.
4. פעולות CRUD וקביעת סטטוס/תפקיד מבוצעות דרך הקריאה לפונקציות ב־`actions.ts`, שלאחריהן מתבצע `revalidatePath` ורענון הנתונים בצד הלקוח.

## תלות טכניות
- Next.js עם תיקיית `app`
- React ו־TypeScript
- Mongoose למסד הנתונים
- ספריית `lucide-react` לאייקונים
- `@tanstack/react-query` בלייאאוט לניהול בקשות
- Zod ול־`react-hook-form` לאימות טפסים
