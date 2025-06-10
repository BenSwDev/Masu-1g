const fs = require('fs')

// Hebrew translations for the new keys that were added
const newTranslations = {
  "common.deactivate": "השבת",
  "common.delete": "מחק",
  "common.deleting": "מוחק",
  "common.duplicate": "שכפל",
  "common.edit": "ערוך",
  "common.email": "אימייל",
  "common.error": "שגיאה",
  "common.errorDescription": "תיאור שגיאה",
  "common.errors.cancellationFailed": "ביטול נכשל",
  "common.export": "ייצא",
  "common.featureComingSoon": "תכונה בקרוב",
  "common.female": "נקבה",
  "common.goBack": "חזור",
  "common.hours": "שעות",
  "common.id": "מזהה",
  "common.inactive": "לא פעיל",
  "common.included": "כלול",
  "common.loading": "טוען",
  "common.male": "זכר",
  "common.minutes": "דקות",
  "common.minutes_short": "דק'",
  "common.months": "חודשים",
  "common.more": "עוד",
  "common.name": "שם",
  "common.next": "הבא",
  "common.no": "לא",
  "common.none": "ללא",
  "common.notApplicable": "לא רלוונטי",
  "common.notAssigned": "לא הוקצה",
  "common.notAvailable": "לא זמין",
  "common.notSet": "לא נקבע",
  "common.notSpecified": "לא צוין",
  "common.of": "מתוך",
  "common.openMenu": "פתח תפריט",
  "common.orderSummary": "סיכום הזמנה",
  "common.page": "עמוד",
  "common.pickDate": "בחר תאריך",
  "common.previous": "הקודם",
  "common.price": "מחיר",
  "common.priceSummary": "סיכום מחיר",
  "common.purchaseSuccessMessage": "הרכישה הושלמה בהצלחה",
  "common.purchaseSuccessful": "רכישה מוצלחת",
  "common.refresh": "רענן",
  "common.reset": "איפוס",
  "common.save": "שמור",
  "common.saveChanges": "שמור שינויים",
  "common.savePreferences": "שמור העדפות",
  "common.saveSettings": "שמור הגדרות",
  "common.saving": "שומר",
  "common.search": "חפש",
  "common.searching": "מחפש",
  "common.status": "סטטוס",
  "common.status.unknown": "לא ידוע",
  "common.step": "שלב",
  "common.submitting": "שולח",
  "common.success": "הצלחה",
  "common.summary": "סיכום",
  "common.termsOfService": "תנאי שירות",
  "common.thisUser": "משתמש זה",
  "common.totalPrice": "מחיר כולל",
  "common.unexpectedError": "שגיאה בלתי צפויה",
  "common.unknown": "לא ידוע",
  "common.unknownError": "שגיאה לא ידועה",
  "common.unknownStep": "שלב לא ידוע",
  "common.unknownTreatment": "טיפול לא ידוע",
  "common.unknownUser": "משתמש לא ידוע",
  "common.unlimited": "ללא הגבלה",
  "common.update": "עדכן",
  "common.updating": "מעדכן",
  "common.validationError": "שגיאת אימות",
  "common.viewDetails": "הצג פרטים",
  "common.yes": "כן",
  
  "profile.name": "שם",
  "profile.namePlaceholder": "הכנס שם מלא",
  "profile.email": "אימייל",
  "profile.emailPlaceholder": "הכנס כתובת אימייל",
  "profile.phone": "טלפון",
  "profile.phonePlaceholder": "הכנס מספר טלפון",
  "profile.bio": "ביוגרפיה",
  "profile.bioPlaceholder": "ספר מעט על עצמך",
  "profile.saveChanges": "שמור שינויים",
  
  "users.addUser": "הוסף משתמש",
  "users.addUserDescription": "הוסף משתמש חדש למערכת",
  "users.fields.name": "שם",
  "users.fields.namePlaceholder": "הכנס שם מלא",
  "users.fields.email": "אימייל",
  "users.fields.emailPlaceholder": "הכנס כתובת אימייל",
  "users.fields.phonePlaceholder": "הכנס מספר טלפון",

  "dashboard.sidebar.roleSwitcherTooltip": "החלף תפקיד",
  "dashboard.sidebar.dashboard": "לוח בקרה",
  "dashboard.sidebar.bookTreatment": "הזמן טיפול",
  "dashboard.sidebar.purchaseSubscription": "רכוש מנוי",
  "dashboard.sidebar.purchaseGiftVoucher": "רכוש שובר מתנה",
  "dashboard.sidebar.profile": "פרופיל",
  "dashboard.sidebar.account": "חשבון",
  "dashboard.sidebar.signOut": "התנתק",
  "dashboard.sidebar.userMenu.toggleTooltip": "תפריט משתמש",
  "dashboard.sidebar.userMenu.treatmentPreferences": "העדפות טיפול",
  "dashboard.sidebar.userMenu.notifications": "התראות",

  "roles.admin": "מנהל",
  "roles.professional": "מטפל",
  "roles.partner": "שותף",
  "roles.member": "חבר",

  "notifications.roleSwitchSuccess": "תפקיד הוחלף בהצלחה",
  "notifications.roleSwitchError": "שגיאה בהחלפת תפקיד",

  // Login & Registration
  "login.and": "ו",
  "login.authenticating": "מאמת",
  "login.authenticationFailed": "אימות נכשל",
  "login.authenticationSuccessful": "אימות הצליח",
  "login.email": "אימייל",
  "login.emailPlaceholder": "הכנס כתובת אימייל",
  "login.enterOTP": "הכנס קוד אימות",
  "login.forgotPassword": "שכחת סיסמה?",
  "login.languageSelector": "בחירת שפה",
  "login.noAccount": "אין לך חשבון?",
  "login.otp": "קוד אימות",
  "login.otpEmailInstructions": "נשלח קוד אימות לאימייל שלך",
  "login.otpEmailSent": "קוד נשלח לאימייל",
  "login.otpPhoneInstructions": "נשלח קוד אימות לטלפון שלך",
  "login.otpPhoneSent": "קוד נשלח לטלפון",
  "login.otpSent": "קוד נשלח",
  "login.otpSentToEmail": "קוד נשלח לאימייל",
  "login.otpSentToPhone": "קוד נשלח לטלפון",
  "login.otpVerified": "קוד אומת",
  "login.password": "סיסמה",
  "login.passwordLabel": "סיסמה",
  "login.phone": "טלפון",
  "login.phonePlaceholder": "הכנס מספר טלפון",
  "login.pleaseWait": "אנא המתן",
  "login.privacyPolicy": "מדיניות פרטיות",
  "login.redirecting": "מפנה",
  "login.resendIn": "שלח שוב בעוד",
  "login.resendOTP": "שלח קוד שוב",
  "login.sendOTP": "שלח קוד",
  "login.sendingOTP": "שולח קוד",
  "login.sendingOTPToEmail": "שולח קוד לאימייל",
  "login.sendingOTPToPhone": "שולח קוד לטלפון",
  "login.signIn": "התחבר",
  "login.signInButton": "התחבר",
  "login.signUp": "הרשם",
  "login.signingIn": "מתחבר",
  "login.termsAgreement": "הסכמה לתנאים",
  "login.termsOfService": "תנאי שירות",
  "login.verifyAndSignIn": "אמת והתחבר",
  "login.verifyingOTP": "מאמת קוד",
  "login.welcome": "ברוכים הבאים",

  // Register
  "register.alreadyHaveAccount": "יש לך כבר חשבון?",
  "register.and": "ו",
  "register.april": "אפריל",
  "register.august": "אוגוסט",
  "register.confirmPassword": "אמת סיסמה",
  "register.createAccount": "צור חשבון",
  "register.dateOfBirth": "תאריך לידה",
  "register.day": "יום",
  "register.december": "דצמבר",
  "register.email": "אימייל",
  "register.emailPlaceholder": "הכנס כתובת אימייל",
  "register.february": "פברואר",
  "register.female": "נקבה",
  "register.fullName": "שם מלא",
  "register.fullNamePlaceholder": "הכנס שם מלא",
  "register.gender": "מין",
  "register.january": "ינואר",
  "register.july": "יולי",
  "register.june": "יוני",
  "register.male": "זכר",
  "register.march": "מרץ",
  "register.may": "מאי",
  "register.month": "חודש",
  "register.november": "נובמבר",
  "register.october": "אוקטובר",
  "register.other": "אחר",
  "register.password": "סיסמה",
  "register.passwordRequirements": "דרישות סיסמה",
  "register.phone": "טלפון",
  "register.phonePlaceholder": "הכנס מספר טלפון",
  "register.privacyPolicy": "מדיניות פרטיות",
  "register.registerAsProfessional": "הרשם כמטפל",
  "register.registerButton": "הרשם",
  "register.september": "ספטמבר",
  "register.signIn": "התחבר",
  "register.termsAgreement": "הסכמה לתנאים",
  "register.termsOfService": "תנאי שירות",
  "register.welcome": "ברוכים הבאים",
  "register.year": "שנה",

  // Payment Methods
  "paymentMethods.addNew": "הוסף חדש",
  "paymentMethods.addNewLink": "הוסף אמצעי תשלום חדש",
  "paymentMethods.card": "כרטיס",
  "paymentMethods.createError": "שגיאה ביצירת אמצעי תשלום",
  "paymentMethods.created": "אמצעי תשלום נוצר",
  "paymentMethods.defaultCard": "כרטיס ברירת מחדל",
  "paymentMethods.defaultSet": "הוגדר כברירת מחדל",
  "paymentMethods.deleteConfirm": "אתה בטוח שברצונך למחוק?",
  "paymentMethods.deleteConfirmDescription": "פעולה זו לא ניתנת לביטול",
  "paymentMethods.deleteError": "שגיאה במחיקת אמצעי תשלום",
  "paymentMethods.deleted": "אמצעי תשלום נמחק",
  "paymentMethods.details": "פרטי תשלום",
  "paymentMethods.edit": "ערוך",
  "paymentMethods.error": "שגיאה",
  "paymentMethods.fields.cardHolderName": "שם בעל הכרטיס",
  "paymentMethods.fields.cardHolderNamePlaceholder": "הכנס שם בעל הכרטיס",
  "paymentMethods.fields.cardName": "שם הכרטיס",
  "paymentMethods.fields.cardNamePlaceholder": "הכנס שם לכרטיס",
  "paymentMethods.fields.cardNumber": "מספר כרטיס",
  "paymentMethods.fields.cvv": "CVV",
  "paymentMethods.fields.expiry": "תוקף",
  "paymentMethods.fields.expiryMonth": "חודש תוקף",
  "paymentMethods.fields.expiryYear": "שנת תוקף",
  "paymentMethods.fields.isDefault": "כרטיס ברירת מחדל",
  "paymentMethods.fields.monthPlaceholder": "חודש",
  "paymentMethods.fields.yearPlaceholder": "שנה",
  "paymentMethods.noPaymentMethods": "אין אמצעי תשלום",
  "paymentMethods.selectPaymentMethod": "בחר אמצעי תשלום",
  "paymentMethods.selectPaymentMethodDesc": "בחר אמצעי תשלום מהרשימה",
  "paymentMethods.setDefault": "הגדר כברירת מחדל",
  "paymentMethods.setDefaultError": "שגיאה בהגדרת ברירת מחדל",
  "paymentMethods.title": "אמצעי תשלום",
  "paymentMethods.unknown": "לא ידוע",
  "paymentMethods.updateError": "שגיאה בעדכון אמצעי תשלום",
  "paymentMethods.updated": "אמצעי תשלום עודכן",

  // Error messages
  "errors.authFailed": "אימות נכשל",
  "errors.emailExists": "אימייל כבר קיים",
  "errors.invalidDateOfBirth": "תאריך לידה לא תקין",
  "errors.invalidEmail": "אימייל לא תקין",
  "errors.invalidInput": "קלט לא תקין",
  "errors.invalidOTP": "קוד אימות לא תקין",
  "errors.invalidPassword": "סיסמה לא תקינה",
  "errors.invalidPhone": "מספר טלפון לא תקין",
  "errors.missingFields": "שדות חסרים",
  "errors.noUserFound": "משתמש לא נמצא",
  "errors.otpSendFailed": "שליחת קוד נכשלה",
  "errors.otpVerificationFailed": "אימות קוד נכשל",
  "errors.passwordMismatch": "סיסמאות לא תואמות",
  "errors.phoneExists": "טלפון כבר קיים",
  "errors.registrationFailed": "הרשמה נכשלה",
  "errors.unknown": "שגיאה לא ידועה",
  "errors.weakPassword": "סיסמה חלשה",

  // Basic form fields
  "confirmPassword": "אמת סיסמה",
  "createdAt": "נוצר בתאריך",
  "currentPassword": "סיסמה נוכחית",
  "newEmail": "אימייל חדש",
  "newPassword": "סיסמה חדשה",
  "password": "סיסמה",
  "email": "אימייל",
  "phone": "טלפון",
  "name": "שם",
  "description": "תיאור",
  "quantity": "כמות",
  "role": "תפקיד",
  "identifier": "מזהה",
  "fullName": "שם מלא",
  "gender": "מין",
  "dateOfBirth": "תאריך לידה",
  "day": "יום",
  "month": "חודש",
  "year": "שנה",
  "isActive": "פעיל",
  "validityMonths": "חודשי תוקף",

  // Address fields
  "city": "עיר",
  "street": "רחוב",
  "streetNumber": "מספר בית",
  "hasPrivateParking": "יש חניה פרטית",
  "isDefault": "ברירת מחדל",
  "floor": "קומה",
  "entrance": "כניסה",
  "doorName": "שם על הדלת",
  "buildingName": "שם הבניין",
  "hotelName": "שם המלון",
  "roomNumber": "מספר חדר",
  "instructions": "הוראות"
}

function translateSpecificKeys() {
  console.log('🔄 Translating specific keys to Hebrew...\n')
  
  // Read current Hebrew translations
  const heTranslations = JSON.parse(fs.readFileSync('./lib/translations/he.json', 'utf8'))
  
  let translatedCount = 0
  
  // Apply translations only for keys that currently have English placeholder
  function translateObject(obj, translations, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = path ? `${path}.${key}` : key
      
      if (typeof value === 'string') {
        // If the value is the same as the key (placeholder), replace with translation
        if (value === fullKey && translations[fullKey]) {
          obj[key] = translations[fullKey]
          translatedCount++
          console.log(`✅ Translated: ${fullKey} -> ${translations[fullKey]}`)
        }
      } else if (typeof value === 'object' && value !== null) {
        translateObject(value, translations, fullKey)
      }
    }
  }
  
  translateObject(heTranslations, newTranslations)
  
  // Write updated file
  fs.writeFileSync('./lib/translations/he.json', JSON.stringify(heTranslations, null, 2), 'utf8')
  
  console.log(`\n✅ Successfully translated ${translatedCount} keys to Hebrew!`)
  console.log('📝 Updated he.json file with Hebrew translations.')
  
  return translatedCount
}

// Run the script
if (require.main === module) {
  translateSpecificKeys()
}

module.exports = { translateSpecificKeys } 