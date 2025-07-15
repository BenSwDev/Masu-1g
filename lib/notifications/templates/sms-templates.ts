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
    treatmentDisplay += ` (${data.treatmentDuration} דקות)`
  }

  // Check if this is an admin assignment (based on presence of responseId indicating pre-created response)
  const isAdminAssigned = !!data.responseId

  let message: string
  switch (language) {
    case "he":
      if (isAdminAssigned) {
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
        message = `🔔 הזמנה חדשה זמינה!

📋 טיפול: ${treatmentDisplay}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📍 עיר: ${city}

✅ לקבלת ההזמנה: ${responseUrl}?action=accept

או הכנס לאפליקציה: masu.co.il`
      }
      break
    case "ru":
      message = `🔔 Доступен новый заказ!

📋 Процедура: ${treatmentDisplay}
📅 Дата: ${bookingDate}
🕐 Время: ${bookingTime}
📍 Город: ${city}

✅ Принять заказ: ${responseUrl}?action=accept

Или войдите в приложение: masu.co.il`
      break
    default: // English
      message = `🔔 New booking available!

📋 Treatment: ${treatmentDisplay}
📅 Date: ${bookingDate}
🕐 Time: ${bookingTime}
📍 City: ${city}

✅ Accept booking: ${responseUrl}?action=accept

Or enter the app: masu.co.il`
  }
  
  return message
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
