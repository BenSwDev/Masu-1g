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

    case "professional-booking-notification":
      return getProfessionalBookingNotificationSmsTemplate(data, language)

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

  let message: string
  switch (language) {
    case "he":
      message = `🔔 הזמנה חדשה זמינה!

📋 טיפול: ${treatmentDisplay}
📅 תאריך: ${bookingDate}
🕐 שעה: ${bookingTime}
📍 עיר: ${city}

✅ לקבלת ההזמנה: ${responseUrl}?action=accept

או הכנס לאפליקציה: masu.co.il`
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
    let message: string
    switch (language) {
      case "he":
        message = `שלום ${data.recipientName}, ${data.bookerName} הזמין עבורך טיפול ${data.treatmentName} לתאריך ${bookingDate} בשעה ${bookingTime} ומחכה לשיוך מטפל/ת. בעת האישור הסופי תתקבל הודעת אסמס. תוכלו לצפות בהזמנה בקישור הבא: masu.co.il`
        break
      case "ru":
        message = `Здравствуйте, ${data.recipientName}, ${data.bookerName} заказал(а) для вас процедуру ${data.treatmentName} на ${bookingDate} в ${bookingTime} и ожидает назначения специалиста. При окончательном подтверждении вы получите SMS-уведомление. Вы можете просмотреть заказ по ссылке: masu.co.il`
        break
      default: // English
        message = `Hello ${data.recipientName}, ${data.bookerName} booked ${data.treatmentName} treatment for you on ${bookingDate} at ${bookingTime} and is waiting for therapist assignment. You will receive an SMS notification upon final confirmation. You can view the booking at: masu.co.il`
    }
    return message + smsSignature
  } else {
    // Check if this is a booker who booked for someone else
    if (data.isBookerForSomeoneElse && data.actualRecipientName) {
      // Message for the booker when they booked for someone else
      let message: string
      switch (language) {
        case "he":
          message = `שלום ${data.recipientName}, ההזמנה שביצעתה עבור ${data.actualRecipientName} בוצעה ונשלחה לו על כך הודעה בנייד ובמייל. תוכלו לצפות בהזמנה בקישור הבא: masu.co.il`
          break
        case "ru":
          message = `Здравствуйте, ${data.recipientName}, заказ, который вы сделали для ${data.actualRecipientName}, выполнен, и ему отправлено уведомление по SMS и электронной почте. Вы можете просмотреть заказ по ссылке: masu.co.il`
          break
        default: // English
          message = `Hello ${data.recipientName}, the booking you made for ${data.actualRecipientName} has been completed and a notification has been sent to them via SMS and email. You can view the booking at: masu.co.il`
      }
      return message + smsSignature
    } else {
      // Message for the booker (booking for themselves)
      let message: string
      switch (language) {
        case "he":
          message = `שלום ${data.recipientName}, ההזמנה שלך בוצעה בהצלחה לתאריך ${bookingDate} בשעה ${bookingTime} ומחכה לשיוך מטפל/ת. בעת האישור הסופי תתקבל הודעת אסמס. תוכלו לצפות בהזמנה בקישור הבא: masu.co.il`
          break
        case "ru":
          message = `Здравствуйте, ${data.recipientName}, ваш заказ успешно выполнен на ${bookingDate} в ${bookingTime} и ожидает назначения специалиста. При окончательном подтверждении вы получите SMS-уведомление. Вы можете просмотреть заказ по ссылке: masu.co.il`
          break
        default: // English
          message = `Hello ${data.recipientName}, your booking has been successfully completed for ${bookingDate} at ${bookingTime} and is waiting for therapist assignment. You will receive an SMS notification upon final confirmation. You can view the booking at: masu.co.il`
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
