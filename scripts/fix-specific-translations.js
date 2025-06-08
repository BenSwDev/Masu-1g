const fs = require('fs');

// Comprehensive translation mappings
const translations = {
  he: {
    // Addresses
    'addresses.addFirstAddress': 'הוסף כתובת ראשונה',
    'addresses.addFirstAddressShort': 'הוסף ראשונה',
    'addresses.createError': 'שגיאה ביצירת כתובת',
    'addresses.createSuccess': 'כתובת נוצרה בהצלחה',
    'addresses.deleteError': 'שגיאה במחיקת כתובת',
    'addresses.deleteSuccess': 'כתובת נמחקה בהצלחה',
    'addresses.editAddressDialogTitle': 'ערוך כתובת',
    'addresses.fields.apartment': 'דירה',
    'addresses.fields.buildingName': 'שם הבניין',
    'addresses.fields.city': 'עיר',
    'addresses.fields.doorName': 'שם הדלת',
    'addresses.fields.entrance': 'כניסה',
    'addresses.fields.floor': 'קומה',
    'addresses.fields.hotelName': 'שם המלון',
    'addresses.fields.instructions': 'הוראות הגעה',
    'addresses.fields.notes': 'הערות',
    'addresses.fields.otherInstructions': 'הוראות אחרות',
    'addresses.fields.roomNumber': 'מספר חדר',
    'addresses.fields.street': 'רחוב',
    'addresses.fields.streetNumber': 'מספר בית',
    'addresses.noDetails': 'אין פרטים',
    'addresses.setDefaultError': 'שגיאה בהגדרת כתובת ברירת מחדל',
    'addresses.setDefaultSuccess': 'כתובת ברירת מחדל הוגדרה בהצלחה',
    'addresses.updateError': 'שגיאה בעדכון כתובת',
    'addresses.updateSuccess': 'כתובת עודכנה בהצלחה',
    
    // Common
    'common.anonymousUser': 'משתמש אנונימי',
    'common.more': 'עוד',
    'common.unknownStep': 'שלב לא ידוע',
    'common.validationError': 'שגיאת אימות',
    
    // Booking steps
    'bookings.steps.payment': 'תשלום',
    'bookings.steps.scheduling': 'קביעת זמן',
    'bookings.steps.source': 'מקור הזמנה',
    'bookings.steps.treatment': 'בחירת טיפול',
    'bookings.unknownTreatment': 'טיפול לא ידוע',
    
    // Errors
    'errors.fetchFailed': 'שגיאה בטעינת נתונים',
    
    // Member bookings
    'memberBookings.client.error': 'שגיאה',
    'memberBookings.client.noBookings': 'אין הזמנות',
    'memberGiftVouchers.errorLoading': 'שגיאה בטעינת שוברים',
    'memberGiftVouchers.noPurchasedVouchersDescription': 'לא רכשת שוברי מתנה עדיין',
    
    // Gift vouchers
    'giftVoucher': 'שובר מתנה',
    'giftVouchers.expiredShort': 'פג תוקף',
    'giftVouchers.myVouchers.basicInfo': 'מידע בסיסי',
    
    // Notifications
    'notifications': 'התראות',
    
    // Preferences
    'preferences.notifications.errorMinMethods': 'יש לבחור לפחות שיטת התראה אחת',
    'preferences.notifications.saveError': 'שגיאה בשמירת הגדרות התראות',
    'preferences.notifications.saveSuccess': 'הגדרות התראות נשמרו בהצלחה',
    'preferences.treatment.genderAny': 'ללא העדפה',
    'preferences.treatment.genderFemale': 'נקבה',
    'preferences.treatment.genderMale': 'זכר',
    'preferences.treatment.saveError': 'שגיאה בשמירת העדפות טיפול',
    'preferences.treatment.saveSuccess': 'העדפות טיפול נשמרו בהצלחה',
    
    // Profile
    'profile': 'פרופיל',
    'profile.bio': 'ביוגרפיה',
    'profile.bioPlaceholder': 'ספר קצת על עצמך',
    'profile.email': 'אימייל',
    'profile.emailPlaceholder': 'הכנס כתובת אימייל',
    'profile.name': 'שם',
    'profile.namePlaceholder': 'הכנס שם מלא',
    'profile.phone': 'טלפון',
    'profile.phonePlaceholder': 'הכנס מספר טלפון',
    'profile.saveChanges': 'שמור שינויים',
    
    // Purchase gift voucher
    'purchaseGiftVoucher.selectDuration': 'בחר משך זמן',
    
    // Subscriptions
    'subscriptions.cancelError': 'שגיאה בביטול מנוי',
    
    // Users
    'users': 'משתמשים',
    'users.addUser': 'הוסף משתמש',
    'users.addUserDescription': 'צור משתמש חדש במערכת',
    'users.fields.email': 'אימייל',
    'users.fields.emailPlaceholder': 'הכנס כתובת אימייל',
    'users.fields.name': 'שם'
  },
  
  en: {
    // Common
    'common.anonymousUser': 'Anonymous User',
    'common.more': 'More',
    'common.unknownStep': 'Unknown Step',
    'common.validationError': 'Validation Error',
    
    // Addresses
    'addresses.addFirstAddress': 'Add First Address',
    'addresses.addFirstAddressShort': 'Add First',
    'addresses.createError': 'Error creating address',
    'addresses.createSuccess': 'Address created successfully',
    'addresses.deleteError': 'Error deleting address',
    'addresses.deleteSuccess': 'Address deleted successfully',
    'addresses.editAddressDialogTitle': 'Edit Address',
    'addresses.fields.apartment': 'Apartment',
    'addresses.fields.buildingName': 'Building Name',
    'addresses.fields.city': 'City',
    'addresses.fields.doorName': 'Door Name',
    'addresses.fields.entrance': 'Entrance',
    'addresses.fields.floor': 'Floor',
    'addresses.fields.hotelName': 'Hotel Name',
    'addresses.fields.instructions': 'Instructions',
    'addresses.fields.notes': 'Notes',
    'addresses.fields.otherInstructions': 'Other Instructions',
    'addresses.fields.roomNumber': 'Room Number',
    'addresses.fields.street': 'Street',
    'addresses.fields.streetNumber': 'Street Number',
    'addresses.noDetails': 'No Details',
    'addresses.setDefaultError': 'Error setting default address',
    'addresses.setDefaultSuccess': 'Default address set successfully',
    'addresses.updateError': 'Error updating address',
    'addresses.updateSuccess': 'Address updated successfully',
    
    // Member bookings
    'memberBookings.client.noBookings': 'No bookings found',
    'memberGiftVouchers.errorLoading': 'Error loading gift vouchers',
    'memberGiftVouchers.noPurchasedVouchersDescription': 'You haven\'t purchased any gift vouchers yet',
    
    // Preferences
    'preferences.notifications.errorMinMethods': 'Please select at least one notification method',
    'preferences.notifications.saveError': 'Error saving notification settings',
    'preferences.notifications.saveSuccess': 'Notification settings saved successfully',
    'preferences.treatment.genderAny': 'No preference',
    'preferences.treatment.genderFemale': 'Female',
    'preferences.treatment.genderMale': 'Male',
    'preferences.treatment.saveError': 'Error saving treatment preferences',
    'preferences.treatment.saveSuccess': 'Treatment preferences saved successfully'
  },
  
  ru: {
    // Common
    'common.anonymousUser': 'Анонимный пользователь',
    'common.more': 'Ещё',
    'common.unknownStep': 'Неизвестный шаг',
    'common.validationError': 'Ошибка валидации',
    
    // Addresses
    'addresses.addFirstAddress': 'Добавить первый адрес',
    'addresses.addFirstAddressShort': 'Добавить первый',
    'addresses.createError': 'Ошибка создания адреса',
    'addresses.createSuccess': 'Адрес успешно создан',
    'addresses.deleteError': 'Ошибка удаления адреса',
    'addresses.deleteSuccess': 'Адрес успешно удален',
    'addresses.editAddressDialogTitle': 'Редактировать адрес',
    'addresses.fields.apartment': 'Квартира',
    'addresses.fields.buildingName': 'Название здания',
    'addresses.fields.city': 'Город',
    'addresses.fields.doorName': 'Название двери',
    'addresses.fields.entrance': 'Подъезд',
    'addresses.fields.floor': 'Этаж',
    'addresses.fields.hotelName': 'Название отеля',
    'addresses.fields.instructions': 'Инструкции',
    'addresses.fields.notes': 'Заметки',
    'addresses.fields.otherInstructions': 'Другие инструкции',
    'addresses.fields.roomNumber': 'Номер комнаты',
    'addresses.fields.street': 'Улица',
    'addresses.fields.streetNumber': 'Номер дома',
    'addresses.noDetails': 'Нет деталей',
    'addresses.setDefaultError': 'Ошибка установки адреса по умолчанию',
    'addresses.setDefaultSuccess': 'Адрес по умолчанию успешно установлен',
    'addresses.updateError': 'Ошибка обновления адреса',
    'addresses.updateSuccess': 'Адрес успешно обновлен',
    
    // Member bookings
    'memberBookings.client.noBookings': 'Записи не найдены',
    'memberGiftVouchers.errorLoading': 'Ошибка загрузки подарочных сертификатов',
    'memberGiftVouchers.noPurchasedVouchers': 'Вы еще не приобрели подарочные сертификаты',
    
    // Preferences
    'preferences.treatment.genderAny': 'Без предпочтений',
    'preferences.treatment.genderFemale': 'Женщина',
    'preferences.treatment.genderMale': 'Мужчина',
    'preferences.treatment.saveError': 'Ошибка сохранения предпочтений по процедурам',
    'preferences.treatment.saveSuccess': 'Предпочтения по процедурам успешно сохранены'
  }
};

// Function to recursively replace placeholder translations
function replacePlaceholders(obj, translations, prefix = '') {
  let modified = false;
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      const subModified = replacePlaceholders(value, translations, fullKey);
      if (subModified) modified = true;
    } else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      const placeholderKey = value.slice(1, -1);
      if (translations[placeholderKey]) {
        obj[key] = translations[placeholderKey];
        modified = true;
        console.log(`   🔄 Replaced: ${fullKey} = "${translations[placeholderKey]}"`);
      }
    }
  }
  
  return modified;
}

// Main function to fix placeholder translations
function fixPlaceholderTranslations() {
  console.log('🔧 Fixing placeholder translations...');
  
  // Fix Hebrew
  console.log('\n🇮🇱 Fixing Hebrew placeholders...');
  const heJson = JSON.parse(fs.readFileSync('lib/translations/he.json', 'utf-8'));
  const heModified = replacePlaceholders(heJson, translations.he);
  
  if (heModified) {
    fs.writeFileSync('lib/translations/he.json', JSON.stringify(heJson, null, 2), 'utf-8');
    console.log('✅ Updated he.json');
  }
  
  // Fix English
  console.log('\n🇺🇸 Fixing English placeholders...');
  const enJson = JSON.parse(fs.readFileSync('lib/translations/en.json', 'utf-8'));
  const enModified = replacePlaceholders(enJson, translations.en);
  
  if (enModified) {
    fs.writeFileSync('lib/translations/en.json', JSON.stringify(enJson, null, 2), 'utf-8');
    console.log('✅ Updated en.json');
  }
  
  // Fix Russian
  console.log('\n🇷🇺 Fixing Russian placeholders...');
  const ruJson = JSON.parse(fs.readFileSync('lib/translations/ru.json', 'utf-8'));
  const ruModified = replacePlaceholders(ruJson, translations.ru);
  
  if (ruModified) {
    fs.writeFileSync('lib/translations/ru.json', JSON.stringify(ruJson, null, 2), 'utf-8');
    console.log('✅ Updated ru.json');
  }
  
  if (!heModified && !enModified && !ruModified) {
    console.log('✅ No placeholder translations found to fix!');
  }
  
  console.log('\n🎉 Placeholder translation fix complete!');
}

// Run if called directly
if (require.main === module) {
  try {
    fixPlaceholderTranslations();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  fixPlaceholderTranslations,
  replacePlaceholders,
  translations
};
