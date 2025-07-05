# קבצים ותלות הדף "ניהול מטפלים"

הדף הראשי נמצא בנתיב `app/dashboard/(user)/(roles)/admin/professional-management/page.tsx` ומרונדר באופן דינמי. הוא משתמש ברכיב `ProfessionalManagement` לטעינת הנתונים הראשוניים ולהצגת הטבלה.

## רכיבים ופעולות
- `page.tsx` – בודק הרשאות דרך `requireUserSession`, טוען נתוני פתיחה בפעולה `getProfessionals` ומציג את הקומפוננטה `ProfessionalManagement`.
- `actions.ts` – כולל את כל פעולות השרת:
  - `getProfessionals`
  - `getProfessionalById`
  - `createProfessional`
  - `updateProfessionalStatus`
  - `updateProfessionalTreatments`
  - `updateProfessionalBankDetails`
  - `updateProfessionalBasicInfo`
  - `updateProfessionalWorkAreas`
  - `deleteProfessional`
- רכיבי לקוח במיקום `components/dashboard/admin/professional-management/`:
  - `professional-management.tsx` – מציג כרטיסי סטטיסטיקה, מסננים, טבלת מטפלים ופאגינציה.
  - `professional-create-page.tsx` – טופס יצירת מטפל חדש.
  - `professional-edit-page.tsx` – מסך עריכה הכולל לשוניות שונות.
  - `professional-edit-modal.tsx` ו־`professional-profile-dialog.tsx` – חלונות קופצים לעריכה ולצפייה בפרופיל.
  - `professional-edit-error-boundary.tsx` – ניהול שגיאות בעמוד העריכה.
  - תיקיית `tabs/` – רכיבי משנה ללשוניות: פרופיל, טיפולים, איזורי פעילות, הזמנות, חשבון בנק, מסמכים, כספים והסכם.
- מודלי הנתונים: `professional-profile.ts` ו־`user.ts` תחת `lib/db/models` המשמשים לשמירת מטפלים ומשתמשים.

## זרימת עבודה
1. טעינת הדף מפעילה את `getProfessionals` לקבלת רשימת מטפלים וסטטיסטיקות.
2. הקומפוננטה `ProfessionalManagement` מאפשרת חיפוש, סינון ומיון ומבצעת קריאות חוזרות ל־`getProfessionals`.
3. פעולות יצירה ועריכה מפעילות את פונקציות השרת המתאימות ומרעננות את הנתונים בעזרת `revalidatePath`.
4. צפייה או עריכה מפורטת מתבצעת בעמוד `/[id]` המשתמש ב־`ProfessionalEditPage` וב־`ProfessionalEditErrorBoundary`.

## תלות טכניות
- Next.js עם App Router והגדרה `dynamic = 'force-dynamic'`.
- MongoDB דרך Mongoose.
- ספריית React ו־TypeScript.
- רכיבי UI מבוססי shadcn/ui.
- מנגנון תרגום `@/lib/translations/i18n`.
