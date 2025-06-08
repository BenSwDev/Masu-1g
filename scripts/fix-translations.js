const fs = require('fs');
const path = require('path');
const { scanAndGenerateTranslations } = require('./scan-i18n-keys');

// Translation mappings for auto-translation
const hebrewTranslations = {
  // Common
  'common.loading': 'טוען...',
  'common.error': 'שגיאה',
  'common.success': 'הצלחה',
  'common.save': 'שמור',
  'common.cancel': 'ביטול',
  'common.delete': 'מחק',
  'common.edit': 'ערוך',
  'common.create': 'צור',
  'common.back': 'חזרה',
  'common.next': 'הבא',
  'common.submit': 'שלח',
  
  // Addresses
  'addresses.title': 'ניהול כתובות',
  'addresses.addNew': 'הוסף כתובת חדשה',
  'addresses.addNewShort': 'הוסף חדשה',
  'addresses.addAddressDialogTitle': 'הוסף כתובת חדשה',
  'addresses.noAddresses': 'אין כתובות שמורות',
  'addresses.deleteConfirm': 'האם אתה בטוח שברצונך למחוק כתובת זו?',
  'addresses.deleteConfirmDescription': 'לא ניתן לשחזר כתובת שנמחקה',
  'addresses.selectedAddressDetails': 'פרטי הכתובת הנבחרת',
  
  // Address fields
  'addresses.fields.apartmentNumber': 'מספר דירה',
  'addresses.fields.hasPrivateParking': 'חניה פרטית',
  'addresses.fields.hasPrivateParkingFull': 'יש חניה פרטית',
  'addresses.fields.additionalNotes': 'הערות נוספות',
  'addresses.fields.isDefault': 'כתובת ברירת מחדל',
  'addresses.fields.addressType': 'סוג כתובת',
  'addresses.fields.addressTypePlaceholder': 'בחר סוג כתובת',
  
  // Address types
  'addresses.types.apartment': 'דירה',
  'addresses.types.house': 'בית פרטי',
  'addresses.types.office': 'משרד',
  'addresses.types.hotel': 'מלון',
  'addresses.types.other': 'אחר',
  
  // Bookings
  'bookings.confirmation.title': 'אישור הזמנה',
  'bookings.confirmation.paymentStatus.pending': 'ממתין לתשלום',
  'bookings.surcharges.specialTime': 'תוספת שעות מיוחדות',
  'bookings.voucherUsage.redeemedForBooking': 'נוצל עבור הזמנה',
  
  // Booking steps
  'bookings.steps.source.title': 'בחר מקור ההזמנה',
  'bookings.steps.source.description': 'בחר איך ברצונך לבצע את ההזמנה',
  'bookings.steps.source.redeemSubscription': 'ניצול מנוי קיים',
  'bookings.steps.source.redeemSubscriptionDesc': 'השתמש בטיפולים מהמנוי שלך',
  'bookings.steps.source.available': 'זמין',
  'bookings.steps.source.newBooking': 'הזמנה חדשה',
  'bookings.steps.source.newBookingDesc': 'תשלום ישיר עבור הטיפול',
  
  'bookings.steps.treatment.title': 'בחר טיפול',
  'bookings.steps.treatment.description': 'בחר את סוג הטיפול, משך הזמן והמטפל/ת',
  'bookings.steps.treatment.selectSubscription': 'בחר מנוי',
  'bookings.steps.treatment.selectSubscriptionPlaceholder': 'בחר מנוי לניצול',
  'bookings.steps.treatment.selectTreatment': 'בחר טיפול',
  'bookings.steps.treatment.selectDuration': 'בחר משך זמן',
  
  'bookings.steps.scheduling.title': 'קביעת זמן ומיקום',
  'bookings.steps.scheduling.description': 'בחר תאריך, שעה וכתובת עבור הטיפול',
  'bookings.steps.scheduling.selectDate': 'בחר תאריך',
  'bookings.steps.scheduling.selectTime': 'בחר שעה',
  'bookings.steps.scheduling.selectDateFirst': 'בחר תאריך תחילה',
  'bookings.steps.scheduling.flexibleTimeLabel': 'גמישות בזמן',
  'bookings.steps.scheduling.flexibleTimeDesc': 'אני גמיש/ה בזמן הטיפול',
  'bookings.steps.scheduling.selectAddress': 'בחר כתובת',
  'bookings.steps.scheduling.selectAddressPlaceholder': 'בחר כתובת לטיפול',
  'bookings.steps.scheduling.forSomeoneElseLabel': 'הזמנה עבור מישהו אחר',
  'bookings.steps.scheduling.notes': 'הערות נוספות',
  'bookings.steps.scheduling.notesPlaceholder': 'הערות למטפל/ת (אופציונלי)',
  'bookings.steps.scheduling.noSlotsAvailable': 'אין זמנים פנויים',
  'bookings.steps.scheduling.selectTimePlaceholder': 'בחר שעת טיפול',
  'bookings.steps.scheduling.recipientName': 'שם המקבל',
  'bookings.steps.scheduling.recipientPhone': 'טלפון המקבל',
  'bookings.steps.scheduling.therapistPreference': 'העדפת מטפל/ת',
  
  'bookings.steps.summary.title': 'סיכום ההזמנה',
  'bookings.steps.summary.description': 'בדוק את פרטי ההזמנה לפני האישור',
  'bookings.steps.summary.bookingForTitle': 'הזמנה עבור',
  'bookings.steps.summary.treatmentDetails': 'פרטי הטיפול',
  'bookings.steps.summary.treatment': 'טיפול',
  'bookings.steps.summary.dateTime': 'תאריך ושעה',
  'bookings.steps.summary.therapistPreference': 'העדפת מטפל/ת',
  'bookings.steps.summary.addressTitle': 'כתובת הטיפול',
  'bookings.steps.summary.calculatingPrice': 'מחשב מחיר...',
  'bookings.steps.summary.basePrice': 'מחיר בסיס',
  'bookings.steps.summary.totalAmount': 'סכום כולל',
  'bookings.steps.summary.couponCode': 'קוד קופון',
  'bookings.steps.summary.couponPlaceholder': 'הכנס קוד קופון',
  'bookings.steps.summary.couponDesc': 'יש לך קוד הנחה? הכנס אותו כאן',
  
  'bookings.steps.payment.title': 'תשלום ואישור',
  'bookings.steps.payment.description': 'בחר אמצעי תשלום ואשר את ההזמנה',
  'bookings.steps.payment.selectPaymentMethod': 'בחר אמצעי תשלום',
  'bookings.steps.payment.loadingPrice': 'טוען מחיר...',
  'bookings.steps.payment.payAndConfirm': 'שלם ואשר',
  'bookings.steps.payment.agreeToTermsLabel': 'אני מסכים/ה לתנאי השימוש',
  'bookings.steps.payment.agreeToTermsDesc': 'קרא ואשר את תנאי השימוש',
  'bookings.steps.payment.agreeToMarketingLabel': 'אני מסכים/ה לקבל חומר שיווקי',
  
  // Member bookings
  'memberBookings.client.title': 'ההזמנות שלי',
  'memberBookings.client.loading': 'טוען הזמנות...',
  
  // Preferences
  'preferences.title': 'העדפות',
  'preferences.generalPreferences': 'העדפות כלליות',
  'preferences.treatment.title': 'העדפות טיפול',
  'preferences.treatment.description': 'הגדר את העדפות הטיפול שלך עבור הזמנות עתידיות',
  'preferences.treatment.therapistGenderLabel': 'העדפת מגדר מטפל/ת',
  'preferences.notifications.title': 'הגדרות התראות',
  'preferences.notifications.description': 'בחר כיצד ברצונך לקבל עדכונים והתראות',
  'preferences.notifications.methodsLabel': 'שיטות התראה',
  'preferences.notifications.methodEmail': 'אימייל',
  'preferences.notifications.methodSms': 'SMS',
  'preferences.notifications.languageLabel': 'שפת התראות',
  'preferences.notifications.langHe': 'עברית',
  'preferences.notifications.langEn': 'אנגלית',
  'preferences.notifications.langRu': 'רוסית',
  
  // Users
  'users.fields.namePlaceholder': 'הכנס שם מלא',
  'users.fields.phonePlaceholder': 'הכנס מספר טלפון',
  
  // Gift vouchers
  'giftVouchers.status.pending_payment': 'ממתין לתשלום',
  'giftVouchers.status.fully_used': 'נוצל במלואו'
};

const englishTranslations = {
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.submit': 'Submit',
  
  // Addresses
  'addresses.title': 'Address Management',
  'addresses.addNew': 'Add New Address',
  'addresses.addNewShort': 'Add New',
  'addresses.addAddressDialogTitle': 'Add New Address',
  'addresses.noAddresses': 'No saved addresses',
  'addresses.deleteConfirm': 'Are you sure you want to delete this address?',
  'addresses.deleteConfirmDescription': 'This action cannot be undone',
  'addresses.selectedAddressDetails': 'Selected Address Details',
  
  // Address fields
  'addresses.fields.apartmentNumber': 'Apartment Number',
  'addresses.fields.hasPrivateParking': 'Private Parking',
  'addresses.fields.hasPrivateParkingFull': 'Has Private Parking',
  'addresses.fields.additionalNotes': 'Additional Notes',
  'addresses.fields.isDefault': 'Default Address',
  'addresses.fields.addressType': 'Address Type',
  'addresses.fields.addressTypePlaceholder': 'Select address type',
  
  // Address types
  'addresses.types.apartment': 'Apartment',
  'addresses.types.house': 'House',
  'addresses.types.office': 'Office',
  'addresses.types.hotel': 'Hotel',
  'addresses.types.other': 'Other',
  
  // Bookings
  'bookings.confirmation.title': 'Booking Confirmation',
  'bookings.confirmation.paymentStatus.pending': 'Pending Payment',
  'bookings.surcharges.specialTime': 'Special Time Surcharge',
  'bookings.voucherUsage.redeemedForBooking': 'Redeemed for booking',
  
  // Member bookings
  'memberBookings.client.title': 'My Bookings',
  'memberBookings.client.loading': 'Loading bookings...',
  
  // Preferences
  'preferences.title': 'Preferences',
  'preferences.generalPreferences': 'General Preferences',
  'preferences.treatment.title': 'Treatment Preferences',
  'preferences.treatment.description': 'Set your treatment preferences for future bookings',
  'preferences.treatment.therapistGenderLabel': 'Therapist Gender Preference',
  'preferences.notifications.title': 'Notification Settings',
  'preferences.notifications.description': 'Choose how you want to receive updates and notifications',
  'preferences.notifications.methodsLabel': 'Notification Methods',
  'preferences.notifications.methodEmail': 'Email',
  'preferences.notifications.methodSms': 'SMS',
  'preferences.notifications.languageLabel': 'Notification Language',
  'preferences.notifications.langHe': 'Hebrew',
  'preferences.notifications.langEn': 'English',
  'preferences.notifications.langRu': 'Russian',
  
  // Users
  'users.fields.namePlaceholder': 'Enter full name',
  'users.fields.phonePlaceholder': 'Enter phone number',
  
  // Gift vouchers
  'giftVouchers.status.pending_payment': 'Pending Payment',
  'giftVouchers.status.fully_used': 'Fully Used'
};

const russianTranslations = {
  // Common
  'common.loading': 'Загрузка...',
  'common.error': 'Ошибка',
  'common.success': 'Успех',
  'common.save': 'Сохранить',
  'common.cancel': 'Отмена',
  'common.delete': 'Удалить',
  'common.edit': 'Редактировать',
  'common.create': 'Создать',
  'common.back': 'Назад',
  'common.next': 'Далее',
  'common.submit': 'Отправить',
  
  // Addresses
  'addresses.title': 'Управление адресами',
  'addresses.addNew': 'Добавить новый адрес',
  'addresses.addNewShort': 'Добавить новый',
  'addresses.addAddressDialogTitle': 'Добавить новый адрес',
  'addresses.noAddresses': 'Нет сохраненных адресов',
  'addresses.deleteConfirm': 'Вы уверены, что хотите удалить этот адрес?',
  'addresses.deleteConfirmDescription': 'Это действие нельзя отменить',
  'addresses.selectedAddressDetails': 'Детали выбранного адреса',
  
  // Address fields
  'addresses.fields.apartmentNumber': 'Номер квартиры',
  'addresses.fields.hasPrivateParking': 'Частная парковка',
  'addresses.fields.hasPrivateParkingFull': 'Есть частная парковка',
  'addresses.fields.additionalNotes': 'Дополнительные заметки',
  'addresses.fields.isDefault': 'Адрес по умолчанию',
  'addresses.fields.addressType': 'Тип адреса',
  'addresses.fields.addressTypePlaceholder': 'Выберите тип адреса',
  
  // Address types
  'addresses.types.apartment': 'Квартира',
  'addresses.types.house': 'Дом',
  'addresses.types.office': 'Офис',
  'addresses.types.hotel': 'Отель',
  'addresses.types.other': 'Другое',
  
  // Bookings
  'bookings.confirmation.title': 'Подтверждение записи',
  'bookings.confirmation.paymentStatus.pending': 'Ожидание оплаты',
  'bookings.surcharges.specialTime': 'Доплата за особое время',
  'bookings.voucherUsage.redeemedForBooking': 'Использован для записи',
  
  // Member bookings
  'memberBookings.client.title': 'Мои записи',
  'memberBookings.client.loading': 'Загружаются записи...',
  
  // Preferences
  'preferences.title': 'Настройки',
  'preferences.generalPreferences': 'Общие настройки',
  'preferences.treatment.title': 'Предпочтения по процедурам',
  'preferences.treatment.description': 'Настройте ваши предпочтения для будущих записей',
  'preferences.treatment.therapistGenderLabel': 'Предпочтение пола специалиста',
  'preferences.notifications.title': 'Настройки уведомлений',
  'preferences.notifications.description': 'Выберите, как вы хотите получать обновления и уведомления',
  'preferences.notifications.methodsLabel': 'Способы уведомлений',
  'preferences.notifications.methodEmail': 'Email',
  'preferences.notifications.methodSms': 'SMS',
  'preferences.notifications.languageLabel': 'Язык уведомлений',
  'preferences.notifications.langHe': 'Иврит',
  'preferences.notifications.langEn': 'Английский',
  'preferences.notifications.langRu': 'Русский',
  
  // Users
  'users.fields.namePlaceholder': 'Введите полное имя',
  'users.fields.phonePlaceholder': 'Введите номер телефона',
  
  // Gift vouchers
  'giftVouchers.status.pending_payment': 'Ожидание оплаты',
  'giftVouchers.status.fully_used': 'Полностью использован'
};

// Function to merge nested objects deeply
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// Function to build nested object from flat keys and translations
function buildNestedFromFlat(flatTranslations) {
  const nested = {};
  
  for (const [key, value] of Object.entries(flatTranslations)) {
    const parts = key.split('.');
    let current = nested;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }
  
  return nested;
}

// Function to auto-generate missing translation
function generateTranslation(key, lang) {
  // Try exact match first
  const translations = {
    'he': hebrewTranslations,
    'en': englishTranslations, 
    'ru': russianTranslations
  };
  
  if (translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  
  // Generate based on key structure
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Basic fallbacks
  const fallbacks = {
    'he': {
      'title': 'כותרת',
      'description': 'תיאור',
      'loading': 'טוען...',
      'error': 'שגיאה',
      'success': 'הצלחה',
      'save': 'שמור',
      'cancel': 'ביטול',
      'delete': 'מחק',
      'edit': 'ערוך',
      'create': 'צור',
      'back': 'חזרה',
      'next': 'הבא',
      'submit': 'שלח'
    },
    'en': {
      'title': 'Title',
      'description': 'Description',
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      'save': 'Save',
      'cancel': 'Cancel',
      'delete': 'Delete',
      'edit': 'Edit',
      'create': 'Create',
      'back': 'Back',
      'next': 'Next',
      'submit': 'Submit'
    },
    'ru': {
      'title': 'Заголовок',
      'description': 'Описание',
      'loading': 'Загрузка...',
      'error': 'Ошибка',
      'success': 'Успех',
      'save': 'Сохранить',
      'cancel': 'Отмена',
      'delete': 'Удалить',
      'edit': 'Редактировать',
      'create': 'Создать',
      'back': 'Назад',
      'next': 'Далее',
      'submit': 'Отправить'
    }
  };
  
  return fallbacks[lang][lastPart] || `[${key}]`;
}

// Main fix function
function fixTranslations() {
  console.log('🔧 Starting translation fix...');
  
  // Scan for required translations
  const { translations: requiredStructure } = scanAndGenerateTranslations();
  
  // Load existing translations
  const existingHe = JSON.parse(fs.readFileSync('lib/translations/he.json', 'utf-8'));
  const existingEn = JSON.parse(fs.readFileSync('lib/translations/en.json', 'utf-8'));
  const existingRu = JSON.parse(fs.readFileSync('lib/translations/ru.json', 'utf-8'));
  
  // Build missing translations
  function addMissingKeys(existing, required, lang, prefix = '') {
    let modified = false;
    
    for (const [key, value] of Object.entries(required)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        if (!existing[key] || typeof existing[key] !== 'object') {
          existing[key] = {};
          modified = true;
          console.log(`   ➕ Added section: ${fullKey}`);
        }
        
        const subModified = addMissingKeys(existing[key], value, lang, fullKey);
        if (subModified) modified = true;
        
      } else {
        if (!existing[key]) {
          existing[key] = generateTranslation(fullKey, lang);
          modified = true;
          console.log(`   ➕ Added key: ${fullKey} = "${existing[key]}"`);
        }
      }
    }
    
    return modified;
  }
  
  // Fix each language
  console.log('\n🇮🇱 Fixing Hebrew translations...');
  const heModified = addMissingKeys(existingHe, requiredStructure, 'he');
  
  console.log('\n🇺🇸 Fixing English translations...');
  const enModified = addMissingKeys(existingEn, requiredStructure, 'en');
  
  console.log('\n🇷🇺 Fixing Russian translations...');
  const ruModified = addMissingKeys(existingRu, requiredStructure, 'ru');
  
  // Save updated files
  if (heModified) {
    fs.writeFileSync('lib/translations/he.json', JSON.stringify(existingHe, null, 2), 'utf-8');
    console.log('✅ Updated he.json');
  }
  
  if (enModified) {
    fs.writeFileSync('lib/translations/en.json', JSON.stringify(existingEn, null, 2), 'utf-8');
    console.log('✅ Updated en.json');
  }
  
  if (ruModified) {
    fs.writeFileSync('lib/translations/ru.json', JSON.stringify(existingRu, null, 2), 'utf-8');
    console.log('✅ Updated ru.json');
  }
  
  if (!heModified && !enModified && !ruModified) {
    console.log('✅ All translation files are already up to date!');
  }
  
  console.log('\n🎉 Translation fix complete!');
}

// Run if called directly
if (require.main === module) {
  try {
    fixTranslations();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  fixTranslations,
  generateTranslation,
  buildNestedFromFlat,
  mergeDeep
};
