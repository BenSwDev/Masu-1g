import type { NotificationData } from "../notification-types"

// Define Language type locally to avoid importing from client-side i18n
type SMSLanguage = "he" | "en" | "ru"
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Masu"

// SMS signature for all messages
const smsSignature = `

────────────────────
לכל שאלה או בעיה ניתן לפנות אלינו בהודעת WhatsApp או בשיחת טלפון למספר הבא:
072-330-3000
בברכה,
צוות מאסו - masu.co.il

להצטרפות למועדון: 
https://www.spaplus.co.il/club/?src=masu

נא לא להגיב להודעה זו`

/**
 * Get SMS template based on notification type and language
 * @param data Notification data
 * @param language Language code
 * @returns SMS text content
 */
export function getSMSTemplate(data: NotificationData, language: SMSLanguage = "en"): string {
  // Switch based on notification type
  switch (data.type) {
    case "otp":
      return getOTPSmsTemplate(data.code, data.expiresIn || 10, language)

    case "welcome":
      return getWelcomeSmsTemplate(language)

    case "password-reset":
      return getPasswordResetSmsTemplate(data.resetUrl, language)

    case "treatment-booking-success":
      return getTreatmentBookingSuccessSmsTemplate(data, language)

    case "purchase-success":
      return data.message + smsSignature

    case "review-reminder":
      return getReviewReminderSmsTemplate(data, language)

    case "review_request":
      return getReviewRequestSmsTemplate(data, language)

    case "professional-booking-notification":
      return getProfessionalBookingNotificationSmsTemplate(data, language)

    case "BOOKING_ASSIGNED_PROFESSIONAL":
      return getBookingAssignedProfessionalSmsTemplate(data, language)

    case "professional-on-way":
      return getProfessionalOnWaySmsTemplate(data, language)

    case "booking_confirmed":
      return getBookingConfirmedSmsTemplate(data, language)

    case "booking_cancelled":
      return getBookingCancelledSmsTemplate(data, language)

    case "booking_updated":
      return getBookingUpdatedSmsTemplate(data, language)

    case "professional_assigned":
      return getProfessionalAssignedSmsTemplate(data, language)

    case "professional_unassigned":
      return getProfessionalUnassignedSmsTemplate(data, language)

    case "new_booking_available":
      return getNewBookingAvailableSmsTemplate(data, language)

    case "professional-payment-bonus-notification":
      return getProfessionalPaymentBonusSmsTemplate(data, language)

    default:
      const defaultMessage = {
        he: `התקבלה הודעה מ${appName}.`,
        en: `You have received a notification from ${appName}.`,
        ru: `Вы получили уведомление от ${appName}.`,
      }
      return defaultMessage[language] || defaultMessage.en
  }
}

// Professional Booking Notification SMS Template
function getProfessionalBookingNotificationSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  const responseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/professional/booking-response/${data.responseId}`

  // Extract city from address (assuming format like "Street, City" or just "City")
  const city = data.address ? data.address.split(',').pop().trim() : data.city || ''

  // Format treatment name with duration if available
  let treatmentDisplay = data.treatmentName || ''
  if (data.treatmentDuration) {
    treatmentDisplay += ` (${data.treatmentDuration})`
  }

  // ✅ FIX: Correct way to detect admin assignment vs availability notification
  // Admin assignment is when responseMethod is explicitly set to "admin_assignment"
  const isAdminAssigned = data.responseMethod === "admin_assignment"

  let message: string
  switch (language) {
    case "he":
      if (isAdminAssigned) {
        // Message for direct admin assignment
        message = `🎯 ההזמנה שוייכה אליך!

📋 טיפול: ${treatmentDisplay}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📍 כתובת: ${data.address || city}

✅ מנהל המערכת שייך אותך להזמנה
💡 ההזמנה מאושרת ומוכנה לטיפול

🔗 כניסה לעמוד הטיפול: ${responseUrl}

או הכנס לאפליקציה: masu.co.il`
      } else {
        // Message for booking availability notification
        message = `🔔 הזמנה חדשה זמינה לשיוך!

📋 טיפול: ${treatmentDisplay}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📍 עיר: ${city}

💡 ההזמנה זמינה לשיוך - כל עוד לא נתפסה על ידי מטפל אחר

🔗 לצפייה ואישור: ${responseUrl}

או הכנס לאפליקציה: masu.co.il`
      }
      break
    case "ru":
      if (isAdminAssigned) {
        message = `🎯 Заказ назначен вам!

📋 Процедура: ${treatmentDisplay}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📍 Адрес: ${data.address || city}

✅ Администратор системы назначил вам заказ
💡 Заказ подтвержден и готов к выполнению

🔗 Войти в систему: ${responseUrl}

или войдите в приложение: masu.co.il`
      } else {
        message = `🔔 Доступен новый заказ!

📋 Процедура: ${treatmentDisplay}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📍 Город: ${city}

💡 Заказ доступен для назначения - пока не занят другим специалистом

🔗 Просмотр и подтверждение: ${responseUrl}

или войдите в приложение: masu.co.il`
      }
      break
    default: // English
      if (isAdminAssigned) {
        message = `🎯 Booking assigned to you!

📋 Treatment: ${treatmentDisplay}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📍 Address: ${data.address || city}

✅ System administrator assigned you this booking
💡 Booking is confirmed and ready for treatment

🔗 Access treatment page: ${responseUrl}

or enter the app: masu.co.il`
      } else {
        message = `🔔 New booking available!

📋 Treatment: ${treatmentDisplay}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📍 City: ${city}

💡 Booking available for assignment - until taken by another professional

🔗 View and confirm: ${responseUrl}

or enter the app: masu.co.il`
      }
  }
  return message + smsSignature
}

// OTP SMS Template
function getOTPSmsTemplate(code: string, expiresIn: number, language: SMSLanguage): string {
  let message: string
  switch (language) {
    case "he":
      message = `קוד האימות שלך ל-${appName} הוא: ${code}. הקוד תקף ל-${expiresIn} דקות.`
      break
    case "ru":
      message = `Ваш код подтверждения ${appName}: ${code}. Код действителен в течение ${expiresIn} минут.`
      break
    default: // English
      message = `Your ${appName} verification code is: ${code}. Valid for ${expiresIn} minutes.`
  }
  return message + smsSignature
}

// Welcome SMS Template
function getWelcomeSmsTemplate(language: SMSLanguage): string {
  let message: string
  switch (language) {
    case "he":
      message = `ברוך הבא ל-${appName}! תודה שנרשמת.`
      break
    case "ru":
      message = `Добро пожаловать в ${appName}! Спасибо за регистрацию.`
      break
    default: // English
      message = `Welcome to ${appName}! Thanks for signing up.`
  }
  return message + smsSignature
}

// Password Reset SMS Template
function getPasswordResetSmsTemplate(resetUrl: string, language: SMSLanguage): string {
  // Consider using a URL shortener for SMS if resetUrl is long
  let message: string
  switch (language) {
    case "he":
      message = `לאיפוס הסיסמה שלך ב-${appName}, לחץ על הקישור: ${resetUrl}`
      break
    case "ru":
      message = `Для сброса пароля в ${appName} перейдите по ссылке: ${resetUrl}`
      break
    default: // English
      message = `To reset your ${appName} password, click the link: ${resetUrl}`
  }
  return message + smsSignature
}

// Booking Assigned Professional SMS Template
function getBookingAssignedProfessionalSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  const managementLink = data.bookingDetailsLink || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/professional`

  let message: string
  switch (language) {
    case "he":
      message = `🎯 הזמנה שוייכה אליך!

${data.professionalName} שלום,
שוייכה אליך הזמנה חדשה:

📋 טיפול: ${data.treatmentName}
👤 לקוח: ${data.clientName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📍 כתובת: ${data.address || 'לא זמינה'}

📱 לניהול ההזמנה: ${managementLink}

ההזמנה שוייכה על ידי מנהל המערכת`
      break
    case "ru":
      message = `🎯 Заказ назначен вам!

${data.professionalName}, здравствуйте,
Вам назначен новый заказ:

📋 Процедура: ${data.treatmentName}
👤 Клиент: ${data.clientName}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📍 Адрес: ${data.address || 'недоступен'}

📱 Управление заказом: ${managementLink}

Заказ назначен администратором системы`
      break
    default: // English
      message = `🎯 Booking assigned to you!

Hello ${data.professionalName},
A new booking has been assigned to you:

📋 Treatment: ${data.treatmentName}
👤 Client: ${data.clientName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📍 Address: ${data.address || 'not available'}

📱 Manage booking: ${managementLink}

Booking assigned by system administrator`
  }
  
  return message + smsSignature
}

// Treatment Booking Success SMS Template
function getTreatmentBookingSuccessSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  if (data.isForSomeoneElse) {
    // Message for the recipient when someone else booked for them
    const bookingDetailsLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking-details/${data.bookingNumber}`
    let message: string
    switch (language) {
      case "he":
        message = `שלום ${data.recipientName}, ${data.bookerName} הזמין עבורך טיפול ${data.treatmentName} לתאריך ${bookingDate} בשעה ${bookingTime} ומחכה לשיוך מטפל/ת. בעת האישור הסופי תתקבל הודעת אסמס. תוכלו לצפות בהזמנה בקישור הבא: ${bookingDetailsLink}`
        break
      case "ru":
        message = `Здравствуйте, ${data.recipientName}, ${data.bookerName} заказал(а) для вас процедуру ${data.treatmentName} на ${bookingDate} в ${bookingTime} и ожидает назначения специалиста. При окончательном подтверждении вы получите SMS-уведомление. Вы можете просмотреть заказ по ссылке: ${bookingDetailsLink}`
        break
      default: // English
        message = `Hello ${data.recipientName}, ${data.bookerName} booked ${data.treatmentName} treatment for you on ${bookingDate} at ${bookingTime} and is waiting for therapist assignment. You will receive an SMS notification upon final confirmation. You can view the booking at: ${bookingDetailsLink}`
    }
    return message + smsSignature
  } else {
    // Check if this is a booker who booked for someone else
    if (data.isBookerForSomeoneElse && data.actualRecipientName) {
      // Message for the booker when they booked for someone else
      const bookingDetailsLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking-details/${data.bookingNumber}`
      let message: string
      switch (language) {
        case "he":
          message = `שלום ${data.recipientName}, תואם טיפול עבור ${data.actualRecipientName} לפי המידע שהוזמן עבורו ונשלחה לו על כך הודעה בנייד ובמייל. ניתן לצפות בהזמנה בקישור: ${bookingDetailsLink}`
          break
        case "ru":
          message = `Здравствуйте, ${data.recipientName}, заказ для ${data.actualRecipientName} согласован в соответствии с заказанной информацией, и ему отправлено уведомление по SMS и электронной почте. Вы можете просмотреть заказ по ссылке: ${bookingDetailsLink}`
          break
        default: // English
          message = `Hello ${data.recipientName}, a treatment has been arranged for ${data.actualRecipientName} according to the information ordered for them and a notification has been sent to them via SMS and email. You can view the booking at: ${bookingDetailsLink}`
      }
      return message + smsSignature
    } else {
      // Message for the booker (booking for themselves)
      const bookingDetailsLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking-details/${data.bookingNumber}`
      let message: string
      switch (language) {
        case "he":
          message = `שלום ${data.recipientName}, ההזמנה שלך בוצעה בהצלחה לתאריך ${bookingDate} בשעה ${bookingTime} ומחכה לשיוך מטפל/ת. בעת האישור הסופי תתקבל הודעת אסמס. תוכלו לצפות בהזמנה בקישור הבא: ${bookingDetailsLink}`
          break
        case "ru":
          message = `Здравствуйте, ${data.recipientName}, ваш заказ успешно выполнен на ${bookingDate} в ${bookingTime} и ожидает назначения специалиста. При окончательном подтверждении вы получите SMS-уведомление. Вы можете просмотреть заказ по ссылке: ${bookingDetailsLink}`
          break
        default: // English
          message = `Hello ${data.recipientName}, your booking has been successfully completed for ${bookingDate} at ${bookingTime} and is waiting for therapist assignment. You will receive an SMS notification upon final confirmation. You can view the booking at: ${bookingDetailsLink}`
      }
      return message + smsSignature
    }
  }
}

function getReviewReminderSmsTemplate(data: any, language: SMSLanguage): string {
  const reviewLink = data.reviewLink
  let message: string
  switch (language) {
    case "he":
      message = `שלום ${data.recipientName}, נשמח אם תדרג/י את הטיפול שקיבלת. שלחו לנו חוות דעת בקישור: ${reviewLink}`
      break
    case "ru":
      message = `Здравствуйте, ${data.recipientName}! Мы будем рады вашему отзыву о полученной услуге: ${reviewLink}`
      break
    default:
      message = `Hi ${data.recipientName}, we'd love to hear your feedback about your treatment: ${reviewLink}`
  }
  return message + smsSignature
}

function getReviewRequestSmsTemplate(data: any, language: SMSLanguage): string {
  let message: string
  switch (language) {
    case "he":
      message = `🌟 שלום ${data.customerName}! 

איך היה הטיפול ${data.treatmentName} עם ${data.professionalName}? 

נשמח לחוות דעתך: ${data.reviewUrl}

הזמנה #${data.bookingNumber}
תודה שבחרת במאסו! 🙏`
      break
    case "ru":
      message = `🌟 Здравствуйте, ${data.customerName}! 

Как прошла процедура ${data.treatmentName} с ${data.professionalName}? 

Будем рады вашему отзыву: ${data.reviewUrl}

Заказ #${data.bookingNumber}
Спасибо, что выбрали Masu! 🙏`
      break
    default: // English
      message = `🌟 Hello ${data.customerName}! 

How was your ${data.treatmentName} treatment with ${data.professionalName}? 

We'd love your feedback: ${data.reviewUrl}

Booking #${data.bookingNumber}
Thank you for choosing Masu! 🙏`
  }
  return message + smsSignature
}

// Professional On Way SMS Template - when professional marks en route
function getProfessionalOnWaySmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  let message: string
  switch (language) {
    case "he":
      message = `🚗 המטפל/ת בדרך אליכם!

שלום, ${data.professionalName} יצא/ה אליכם לטיפול ${data.treatmentName}.

📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📝 הזמנה: ${data.bookingNumber}

המטפל/ת יגיע/תגיע בקרוב!`
      break
    case "ru":
      message = `🚗 Специалист в пути к вам!

Здравствуйте, ${data.professionalName} направляется к вам для процедуры ${data.treatmentName}.

📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📝 Заказ: ${data.bookingNumber}

Специалист скоро прибудет!`
      break
    default: // English
      message = `🚗 Your therapist is on the way!

Hello, ${data.professionalName} is heading to you for ${data.treatmentName} treatment.

📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📝 Booking: ${data.bookingNumber}

Your therapist will arrive soon!`
  }
  
  return message + smsSignature
}

// Booking Confirmed SMS Template
function getBookingConfirmedSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  let message: string
  switch (language) {
    case "he":
      message = `✅ ההזמנה שלך אושרה!

שלום ${data.customerName}, ההזמנה שלך אושרה בהצלחה:

📋 טיפול: ${data.treatmentName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📝 הזמנה: ${data.bookingNumber}

${data.professionalName ? `👨‍⚕️ המטפל שלך: ${data.professionalName}` : '🔄 המטפל ייקבע בקרוב'}`
      break
    case "ru":
      message = `✅ Ваш заказ подтвержден!

Здравствуйте, ${data.customerName}, ваш заказ успешно подтвержден:

📋 Процедура: ${data.treatmentName}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📝 Заказ: ${data.bookingNumber}

${data.professionalName ? `👨‍⚕️ Ваш специалист: ${data.professionalName}` : '🔄 Специалист будет назначен в ближайшее время'}`
      break
    default: // English
      message = `✅ Your booking is confirmed!

Hello ${data.customerName}, your booking has been successfully confirmed:

📋 Treatment: ${data.treatmentName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📝 Booking: ${data.bookingNumber}

${data.professionalName ? `👨‍⚕️ Your therapist: ${data.professionalName}` : '🔄 Your therapist will be assigned soon'}`
  }
  
  return message + smsSignature
}

// Booking Cancelled SMS Template
function getBookingCancelledSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  let message: string
  switch (language) {
    case "he":
      message = `❌ ההזמנה שלך בוטלה

שלום ${data.customerName}, ההזמנה שלך בוטלה:

📋 טיפול: ${data.treatmentName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📝 הזמנה: ${data.bookingNumber}

${data.reason ? `💭 סיבת הביטול: ${data.reason}` : ''}

💡 נשמח לעזור לך להזמין מועד חדש`
      break
    case "ru":
      message = `❌ Ваш заказ отменен

Здравствуйте, ${data.customerName}, ваш заказ был отменен:

📋 Процедура: ${data.treatmentName}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📝 Заказ: ${data.bookingNumber}

${data.reason ? `💭 Причина отмены: ${data.reason}` : ''}

💡 Мы будем рады помочь вам забронировать новое время`
      break
    default: // English
      message = `❌ Your booking has been cancelled

Hello ${data.customerName}, your booking has been cancelled:

📋 Treatment: ${data.treatmentName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📝 Booking: ${data.bookingNumber}

${data.reason ? `💭 Cancellation reason: ${data.reason}` : ''}

💡 We'd be happy to help you book a new appointment`
  }
  
  return message + smsSignature
}

// Booking Updated SMS Template
function getBookingUpdatedSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  let message: string
  switch (language) {
    case "he":
      message = `🔄 ההזמנה שלך עודכנה

שלום ${data.customerName}, ההזמנה שלך עודכנה:

📋 טיפול: ${data.treatmentName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📝 הזמנה: ${data.bookingNumber}

${data.changes ? `📝 שינויים: ${data.changes}` : ''}`
      break
    case "ru":
      message = `🔄 Ваш заказ обновлен

Здравствуйте, ${data.customerName}, ваш заказ был обновлен:

📋 Процедура: ${data.treatmentName}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📝 Заказ: ${data.bookingNumber}

${data.changes ? `📝 Изменения: ${data.changes}` : ''}`
      break
    default: // English
      message = `🔄 Your booking has been updated

Hello ${data.customerName}, your booking has been updated:

📋 Treatment: ${data.treatmentName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📝 Booking: ${data.bookingNumber}

${data.changes ? `📝 Changes: ${data.changes}` : ''}`
  }
  
  return message + smsSignature
}

// Professional Assigned SMS Template
function getProfessionalAssignedSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  let message: string
  switch (language) {
    case "he":
      message = `🎯 שויך מטפל להזמנה שלך!

שלום ${data.customerName}, מטפל שויך להזמנה שלך:

📋 טיפול: ${data.treatmentName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📝 הזמנה: ${data.bookingNumber}
👨‍⚕️ המטפל שלך: ${data.professionalName}

`
      break
    case "ru":
      message = `🎯 К вашему заказу назначен специалист!

Здравствуйте, ${data.customerName}, к вашему заказу назначен специалист:

📋 Процедура: ${data.treatmentName}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📝 Заказ: ${data.bookingNumber}
👨‍⚕️ Ваш специалист: ${data.professionalName}

`
      break
    default: // English
      message = `🎯 A therapist has been assigned to your booking!

Hello ${data.customerName}, a therapist has been assigned to your booking:

📋 Treatment: ${data.treatmentName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📝 Booking: ${data.bookingNumber}
👨‍⚕️ Your therapist: ${data.professionalName}

`
  }
  
  return message + smsSignature
}

// Professional Unassigned SMS Template
function getProfessionalUnassignedSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  let message: string
  switch (language) {
    case "he":
      message = `⚠️ עדכון בנוגע להזמנה שלך

שלום ${data.customerName}, יש עדכון בנוגע להזמנה שלך:

📋 טיפול: ${data.treatmentName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📝 הזמנה: ${data.bookingNumber}

💭 מסיבות שונות, ${data.professionalName} לא יוכל לבצע את הטיפול
🔄 אנחנו כבר עובדים על מציאת מטפל חלופי מתאים

💡 הודעה תישלח אליך בהקדם`
      break
    case "ru":
      message = `⚠️ Обновление по вашему заказу

Здравствуйте, ${data.customerName}, есть обновление по вашему заказу:

📋 Процедура: ${data.treatmentName}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📝 Заказ: ${data.bookingNumber}

💭 По различным причинам ${data.professionalName} не сможет выполнить процедуру
🔄 Мы уже работаем над поиском подходящего альтернативного специалиста

💡 Уведомление будет отправлено вам в ближайшее время`
      break
    default: // English
      message = `⚠️ Update regarding your booking

Hello ${data.customerName}, there's an update regarding your booking:

📋 Treatment: ${data.treatmentName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📝 Booking: ${data.bookingNumber}

💭 Due to various reasons, ${data.professionalName} will not be able to perform the treatment
🔄 We are already working on finding a suitable alternative therapist

💡 A notification will be sent to you shortly`
  }
  
  return message + smsSignature
}

// New Booking Available SMS Template (for professionals)
function getNewBookingAvailableSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem" 
    }
  )

  let message: string
  switch (language) {
    case "he":
      message = `🔔 הזמנה חדשה זמינה לשיוך!

📋 טיפול: ${data.treatmentName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📍 עיר: ${data.city}
💰 מחיר: ₪${data.price}

⚡ ההזמנה זמינה כל עוד לא נתפסה על ידי מטפל אחר
💡 מומלץ לענות מהר!

${data.responseLink ? `🔗 לצפייה ואישור: ${data.responseLink}` : '📱 או הכנס לאפליקציה: masu.co.il'}`
      break
    case "ru":
      message = `🔔 Доступен новый заказ для назначения!

📋 Процедура: ${data.treatmentName}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📍 Город: ${data.city}
💰 Цена: ₪${data.price}

⚡ Заказ доступен, пока не занят другим специалистом
💡 Рекомендуется отвечать быстро!

${data.responseLink ? `🔗 Для просмотра и подтверждения: ${data.responseLink}` : '📱 или войдите в приложение: masu.co.il'}`
      break
    default: // English
      message = `🔔 New booking available for assignment!

📋 Treatment: ${data.treatmentName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📍 City: ${data.city}
💰 Price: ₪${data.price}

⚡ The booking is available as long as it hasn't been taken by another therapist
💡 We recommend responding quickly!

${data.responseLink ? `🔗 To view and confirm: ${data.responseLink}` : '📱 or enter the app: masu.co.il'}`
  }
  
  return message + smsSignature
}

// Professional Payment Bonus SMS Template
function getProfessionalPaymentBonusSmsTemplate(data: any, language: SMSLanguage): string {
  const bookingDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      timeZone: "Asia/Jerusalem" 
    }
  )
  
  const bookingTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: "Asia/Jerusalem",
      hour12: false
    }
  )

  let message = ""
  const smsSignature = `\n\n${appName} - מאסו`
  
  // Extract city from address for consistency
  const city = data.address ? data.address.split(',').pop()?.trim() : ''

  switch (language) {
    case "he":
      message = `🔔 הזמנה חדשה זמינה לשיוך!

📋 טיפול: ${data.treatmentName}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📍 עיר: ${city}

💰 החלטנו להעניק בונוס של ₪${data.bonusAmount} להזמנה זו
${data.bonusDescription ? `📝 ${data.bonusDescription}` : ''}

💡 ההזמנה זמינה לשיוך - כל עוד לא נתפסה על ידי מטפל אחר

🔗 לצפייה ואישור: ${data.responseLink}

או הכנס לאפליקציה: masu.co.il`
      break
    case "ru":
      message = `🔔 Новый заказ доступен для назначения!

📋 Процедура: ${data.treatmentName}
📅 Дата: ${bookingDate}  
🕐 Время: ${bookingTime}
📍 Город: ${city}

💰 Мы решили предоставить бонус ₪${data.bonusAmount} за этот заказ
${data.bonusDescription ? `📝 ${data.bonusDescription}` : ''}

💡 Заказ доступен для назначения - пока не занят другим специалистом

🔗 Просмотр и подтверждение: ${data.responseLink}

или войдите в приложение: masu.co.il`
      break
    default: // English
      message = `🔔 New booking available for assignment!

📋 Treatment: ${data.treatmentName}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📍 City: ${city}

💰 We decided to provide a bonus of ₪${data.bonusAmount} for this booking
${data.bonusDescription ? `📝 ${data.bonusDescription}` : ''}

💡 Booking available for assignment - while not taken by another therapist

🔗 To view and confirm: ${data.responseLink}

or enter the app: masu.co.il`
  }
  
  return message + smsSignature
}
