# קבצים ותלות הדף "איזורי פעילות"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/cities/page.tsx` והוא דינמי (מוגדר עם `export const dynamic = "force-dynamic"`). דף זה טוען את רשימת הערים ומציג את ממשק הניהול.

## רכיבים ופעולות
- `page.tsx` – בודק הרשאות באמצעות `requireUserSession`, טוען נתונים בפעולת `getCities` ומציג את רכיב הלקוח `CityManagement`.
- `actions.ts` – מגדיר פעולות שרת: `getCities`, `createCity`, `updateCity`, `deleteCity`, `toggleCityStatus`. כל פעולה מאמתת הרשאות מנהל, מתחברת למסד הנתונים (`connectDB`), ומעדכנת זיכרון מטמון דרך `clearCitiesCache` ו־`revalidatePath`.
- `components/dashboard/admin/city-management/city-management.tsx` – רכיב צד לקוח המנהל חיפוש, פאגינציה והפעלת דיאלוג יצירת עיר. משתמש ב־React hooks לקריאות אל `getCities` ו־`toggleCityStatus`.
- `city-form-dialog.tsx` – חלון קופץ להוספת עיר חדשה. מבצע ולידציה בסיסית לפני קריאה ל־`createCity` ומציג הודעות Toast בהתאם.
- `cities-heading.tsx` – מציג כותרת ו/או תיאור באמצעות רכיב `Heading` הכללי.
- `lib/db/models/city-distance.ts` – מגדיר את מודל Mongoose לעיר (`City`) ולמרחקים בין ערים (`CityDistance`) כולל חישוב המרחקים והעדכון שלהם בעת יצירת עיר חדשה.
- `lib/validation/city-validation.ts` – מנהל מטמון ערים פעילות ומספק סכמת Zod לאימות בחירת עיר.
- `app/api/cities/route.ts` – נתיב API ציבורי המחזיר את רשימת הערים הפעילות לשימוש ברכיבי בחירת עיר.
- רכיבי UI כלליים: `Input`, `Button`, `Table`, `Checkbox`, `CustomPagination` ועוד, הממוקמים תחת `components/common/ui`.

## זרימת עבודה
1. טעינת העמוד מבצעת בדיקת הרשאה ומפעילה את `getCities` לקבלת דף הערים הראשון.
2. רכיב `CityManagement` מציג שדה חיפוש, טבלת ערים וכפתור להוספת עיר חדשה. שינוי החיפוש או מעבר דף מפעיל את `getCities` מהשרת.
3. דיאלוג הוספת עיר (`CityFormDialog`) שולח נתונים ל־`createCity`. לאחר יצירה מתבצעים חישובי מרחקים בין ערים וכל הדף מתרענן.
4. שינוי סטטוס עיר מתבצע על ידי `toggleCityStatus` ומחזיר הודעת הצלחה או שגיאה.

## תלות טכניות
- Next.js 13 עם React ו־TypeScript
- ספריית Mongoose לחיבור MongoDB
- Zod לאימות נתונים
- רכיבי עיצוב מותאמים (Shadcn UI)
