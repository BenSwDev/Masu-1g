import fs from 'fs';
import path from 'path';

// Hebrew translations for common terms
const hebrewTranslations = {
  "common": {
    "previous": "הקודם",
    "page": "עמוד",
    "search": "חיפוש",
    "roles": "תפקידים",
    "sortField": "מיין לפי",
    "sortDirection": "כיוון מיון",
    "created": "נוצר",
    "view": "צפה"
  },
  "dashboard": {
    "sidebar": {
      "products": "מוצרים",
      "categories": "קטגוריות",
      "orders": "הזמנות",
      "support": "תמיכה",
      "settings": "הגדרות"
    }
  },
  "subscriptions": {
    "title": "ניהול מנויים",
    "addNew": "הוסף מנוי חדש",
    "edit": "ערוך מנוי",
    "searchPlaceholder": "חפש מנויים לפי שם",
    "noSubscriptions": "לא נמצאו מנויים",
    "createSuccess": "המנוי נוצר בהצלחה",
    "updateSuccess": "המנוי עודכן בהצלחה",
    "deactivateSuccess": "המנוי הושבת בהצלחה",
    "activateSuccess": "המנוי הופעל בהצלחה",
    "statusUpdateError": "שגיאה בעדכון סטטוס המנוי",
    "deleteSuccess": "המנוי נמחק בהצלחה",
    "deleteError": "שגיאה במחיקת המנוי",
    "deleteConfirm": "האם אתה בטוח שברצונך למחוק מנוי זה?",
    "deleteConfirmDescription": "לא ניתן לבטל פעולה זו",
    "months": "חודשים",
    "includedTreatments": "טיפולים כלולים",
    "sortAscending": "עולה",
    "sortDescending": "יורד",
    "fields": {
      "name": "שם המנוי",
      "description": "תיאור",
      "isActive": "פעיל",
      "quantity": "כמות",
      "bonusQuantity": "כמות בונוס",
      "validityMonths": "תוקף (חודשים)",
      "treatments": "טיפולים",
      "price": "מחיר"
    },
    "activeDescription": "מנויים פעילים יוצגו ללקוחות",
    "quantityDescription": "מספר הטיפולים הכלולים במנוי",
    "bonusDescription": "מספר טיפולי הבונוס (חינם)",
    "validityDescription": "תקופת תוקף המנוי בחודשים",
    "treatmentsDescription": "בחר טיפולים הכלולים במנוי זה",
    "noTreatmentsAvailable": "אין טיפולים זמינים",
    "errors": {
      "nameRequired": "שם המנוי נדרש",
      "descriptionRequired": "תיאור נדרש",
      "quantityRequired": "הכמות חייבת להיות לפחות 1",
      "bonusQuantityInvalid": "כמות הבונוס חייבת להיות לפחות 0",
      "validityRequired": "התוקף חייב להיות לפחות חודש אחד",
      "treatmentsRequired": "יש לבחור לפחות טיפול אחד"
    },
    "status": {
      "expired": "פג תוקף",
      "depleted": "אזל",
      "cancelled": "בוטל"
    },
    "unknownSubscription": "מנוי לא ידוע",
    "purchasedOn": "נרכש ב",
    "remaining": "נותר",
    "expiry": "תוקף",
    "paymentMethod": "אמצעי תשלום",
    "usage": "שימוש",
    "used": "משומש",
    "total": "סה״כ",
    "cancelSuccess": "ביטול הצליח",
    "cancelConfirm": "אשר ביטול",
    "cancelConfirmDescription": "תיאור אישור ביטול",
    "users": {
      "title": "משתמשים",
      "description": "ניהול משתמשים"
    },
    "description": "תיאור",
    "create": "צור",
    "selectValidity": "בחר תוקף",
    "quantity": "כמות",
    "bonus": "בונוס",
    "validity": "תוקף",
    "price": "מחיר"
  },
  "coupons": {
    "title": "קופונים",
    "description": "ניהול קופונים",
    "addNew": "הוסף קופון חדש"
  },
  "giftVouchers": {
    "title": "שוברי מתנה",
    "description": "ניהול שוברי מתנה",
    "addNew": "הוסף שובר מתנה חדש",
    "fields": {
      "code": "קוד",
      "value": "ערך",
      "validFrom": "תקף מ",
      "validUntil": "תקף עד",
      "isActive": "פעיל"
    }
  },
  "identifier": "מזהה",
  "password": "סיסמה",
  "currentPassword": "סיסמה נוכחית",
  "newPassword": "סיסמה חדשה",
  "confirmPassword": "אימות סיסמה",
  "newEmail": "דוא״ל חדש",
  "admin": {
    "users": {
      "searchPlaceholder": "חפש משתמשים...",
      "filterByRole": "סנן לפי תפקיד",
      "allRoles": "כל התפקידים",
      "name": "שם",
      "email": "דוא״ל",
      "roles": "תפקידים",
      "created": "נוצר",
      "actions": "פעולות"
    }
  },
  "roles": {
    "admin": "מנהל",
    "member": "חבר",
    "partner": "שותף",
    "professional": "מקצועי",
    "guest": "אורח"
  },
  "name": "שם",
  "email": "דוא״ל",
  "createdAt": "נוצר ב",
  "page": "עמוד",
  "search": "חיפוש",
  "sortField": "שדה מיון",
  "sortDirection": "כיוון מיון",
  "paymentMethods": {
    "card": "כרטיס"
  },
  "city": "עיר",
  "street": "רחוב",
  "streetNumber": "מספר בית",
  "addressType": "סוג כתובת",
  "hasPrivateParking": "חניה פרטית",
  "additionalNotes": "הערות נוספות",
  "isDefault": "ברירת מחדל",
  "floor": "קומה",
  "apartmentNumber": "מספר דירה",
  "entrance": "כניסה",
  "doorName": "שם דלת",
  "buildingName": "שם בניין",
  "hotelName": "שם מלון",
  "roomNumber": "מספר חדר",
  "instructions": "הוראות",
  "treatments": {
    "errors": {
      "invalidDuration": "משך זמן לא תקין"
    },
    "updateError": "שגיאה בעדכון הטיפול",
    "createError": "שגיאה ביצירת הטיפול",
    "basicInfo": "מידע בסיסי"
  }
};

// Read existing he.json
const heTranslations = JSON.parse(fs.readFileSync('./lib/translations/he.json', 'utf8'));

// Merge translations
function mergeTranslations(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) {
        target[key] = {};
      }
      mergeTranslations(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// Merge the translations
mergeTranslations(heTranslations, hebrewTranslations);

// Write back to he.json
fs.writeFileSync('./lib/translations/he.json', JSON.stringify(heTranslations, null, 2));

console.log('Hebrew translations have been updated successfully!'); 