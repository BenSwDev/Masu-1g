# מסמך טכני - ניהול מטפלים

## סקירה כללית
מערכת ניהול מטפלים מאפשרת לאדמינים לנהל פרופילי מטפלים, לעדכן פרטיהם, לקבוע את סטטוס האישור שלהם ולעקוב אחר ביצועיהם.

## ארכיטקטורה

### קומפוננטות ראשיות
- **ProfessionalManagement** - רכיב ראשי לניהול הרשימה
- **ProfessionalEditPage** - רכיב עריכת מטפל בודד עם טאבים
- **ProfessionalFilters** - רכיב סינון ופעולות כלליות
- **Hooks**: `use-professional-management` - לוגיקת מצב וטעינה

### פתרון בעיית React Error #185
**הבעיה**: לולאת עדכון אינסופית בין `ProfessionalEditPage` והטאבים שלה.

**הגורם**: הטאבים קיבלו `updatedProfessional` כ-prop, עדכנו אותו דרך `onUpdate`, מה שגרם לטאבים להתרנדר מחדש ולחזור על התהליך.

**הפתרון**: 
1. **Memoization**: הוספת `useMemo` לנתוני המטפל עם dependency רק על שדות קריטיים
2. **Controlled Re-renders**: השימוש ב-`memoizedProfessional` במקום `updatedProfessional` בטאבים
3. **Stable Dependencies**: וידוא ש-useEffect מסתמך רק על `professional._id`

```typescript
// Memoize the professional data to prevent unnecessary re-renders
const memoizedProfessional = useMemo(() => updatedProfessional, [
  updatedProfessional._id, 
  updatedProfessional.status, 
  updatedProfessional.isActive
])
```

# תהליך ניהול המטפלים

המערכת מאפשרת לצוות המנהלים לנהל את מאגר המטפלים במערכת.

## תהליך טעינת הדף
- בעת כניסה לנתיב `/dashboard/admin/professional-management` מופעל `requireUserSession` לוודא הרשאות.
- הקומפוננטה `ProfessionalManagement` מקבלת נתוני פתיחה מ־`getProfessionals` הכוללים רשימת מטפלים וסטטיסטיקות.
- בזמן טעינה מוצגים שלדי טעינה לכל החלקים.

## ניהול נתונים וסטטיסטיקות
- הפעולה `getProfessionals` מבצעת שאילתת Aggregation שמחזירה מטפלים עם נתוני משתמש מקושרים.
- בנוסף מחושבות סטטיסטיקות כלליות: סה"כ מטפלים, פעילים וחלוקה לפי סטטוסים.
- הנתונים נשמרים במצב מקומי ומתרעננים על פי מסננים, מיון או חיפוש.

## ניהול רשימת המטפלים
- אפשרויות סינון לפי סטטוס, חיפוש טקסטואלי ומיון (תאריך הצטרפות או שם).
- לחיצה על "רענן" מפעילה קריאה חוזרת לשרת.
- לחיצה על כפתור "הוסף מטפל" יוצרת מטפל חדש במאגר הנתונים ומעבירה לעמוד העריכה שלו.
- לחיצה על שורה בטבלה מעבירה לעמוד עריכה ייעודי.

## פעולות CRUD
- יצירת מטפל ריק: `createEmptyProfessional` יוצר משתמש ומטפל חדש עם נתונים בסיסיים, ללא צורך בטופס.
- יצירה מטופס: `createProfessional` מקבל נתוני טופס, יוצר משתמש ומטפל חדש ומחזיר את האובייקט המלא.
- קריאה: `getProfessionalById` מאחזר מטפל בודד עם נתוני המשתמש.
- עדכון בסיסי: `updateProfessionalBasicInfo` משנה פרטי משתמש וסטטוס מטפל.
- עדכון טיפולים: `updateProfessionalTreatments` מקבל רשימת טיפולים ותעריפים למטפל.
- עדכון איזורי עבודה: `updateProfessionalWorkAreas` שומר ערים ורדיוסי פעילות ומעדכן ערים מכוסות.
- עדכון פרטי בנק: `updateProfessionalBankDetails` שומר פרטי חשבון מוצפנים.
- שינוי סטטוס: `updateProfessionalStatus` מעדכן את סטטוס המטפל (פעיל, ממתין, נדחה וכו').
- מחיקה: `deleteProfessional` בודק שאין הזמנות פעילות ואז מוחק את הפרופיל והמשתמש.

## ולידציה ואימות
- כל הפעולות משתמשות ב־Zod לאימות שדות (לדוגמה טלפון, אימייל, רדיוס וכו').
- לפני כל פעולה נבדקות הרשאות מנהל דרך `getServerSession`.
- קיימות בדיקות למניעת מחיקת מטפל עם הזמנות פעילות או ממתינות.

## ניהול מצב ומשוב
- רכיבי הצד־לקוח מציגים חיווי טעינה ושגיאות באמצעות `useToast`.
- ברכיב העריכה קיימת בדיקה לשינויים שלא נשמרו והצגת אזהרה לפני עזיבה.
- במצב שגיאה חריגה משתמשים ב־`ProfessionalEditErrorBoundary` להצגת הודעה ופעולות רענון.
