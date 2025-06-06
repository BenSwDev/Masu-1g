import type {
  NotificationData,
  PurchaseSuccessGiftVoucherNotificationData,
  PurchaseSuccessSubscriptionNotificationData,
  BookingSuccessNotificationData, // New
  NewBookingAvailableNotificationData, // New
  BookingConfirmedClientNotificationData,
  ProfessionalEnRouteClientNotificationData,
  BookingCompletedClientNotificationData,
} from "../notification-types" // Ensure new types are imported or compatible

// Define Language type locally to avoid importing from client-side i18n
type SMSLanguage = "he" | "en" | "ru"
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Masu"

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

    case "appointment":
      return getAppointmentSmsTemplate(data.date, data.serviceName, language)

    case "GIFT_VOUCHER_RECEIVED": // For the recipient of a gift
      return getGiftVoucherReceivedSmsTemplate(
        data.recipientName,
        data.purchaserName,
        data.voucherCode,
        data.greetingMessage,
        language,
      )

    case "BOOKING_SUCCESS":
      return getBookingSuccessSmsTemplate(
        data as BookingSuccessNotificationData, // Cast to specific type
        language,
      )

    case "NEW_BOOKING_AVAILABLE":
      return getNewBookingAvailableSmsTemplate(
        data as NewBookingAvailableNotificationData, // Cast to specific type
        language,
      )

    case "BOOKING_CONFIRMED_CLIENT":
      return getBookingConfirmedClientSmsTemplate(data as BookingConfirmedClientNotificationData, language)

    case "PROFESSIONAL_EN_ROUTE_CLIENT":
      return getProfessionalEnRouteClientSmsTemplate(data as ProfessionalEnRouteClientNotificationData, language)

    case "BOOKING_COMPLETED_CLIENT":
      return getBookingCompletedClientSmsTemplate(data as BookingCompletedClientNotificationData, language)

    case "PURCHASE_SUCCESS_SUBSCRIPTION":
      return getPurchaseSuccessSubscriptionSmsTemplate(
        data as PurchaseSuccessSubscriptionNotificationData, // Cast to specific type
        language,
      )

    case "PURCHASE_SUCCESS_GIFT_VOUCHER": // For the purchaser
      return getPurchaseSuccessGiftVoucherSmsTemplate(
        data as PurchaseSuccessGiftVoucherNotificationData, // Cast to specific type
        language,
      )

    case "custom":
      return data.message

    default:
      const defaultMessage = {
        he: `התקבלה הודעה מ${appName}.`,
        en: `You have received a notification from ${appName}.`,
        ru: `Вы получили уведомление от ${appName}.`,
      }
      return defaultMessage[language] || defaultMessage.en
  }
}

// OTP SMS Template
function getOTPSmsTemplate(code: string, expiresIn: number, language: SMSLanguage): string {
  switch (language) {
    case "he":
      return `קוד האימות שלך ל-${appName} הוא: ${code}. הקוד תקף ל-${expiresIn} דקות.`
    case "ru":
      return `Ваш код подтверждения ${appName}: ${code}. Код действителен в течение ${expiresIn} минут.`
    default: // English
      return `Your ${appName} verification code is: ${code}. Valid for ${expiresIn} minutes.`
  }
}

// Welcome SMS Template
function getWelcomeSmsTemplate(language: SMSLanguage): string {
  switch (language) {
    case "he":
      return `ברוך הבא ל-${appName}! תודה שנרשמת.`
    case "ru":
      return `Добро пожаловать в ${appName}! Спасибо за регистрацию.`
    default: // English
      return `Welcome to ${appName}! Thanks for signing up.`
  }
}

// Password Reset SMS Template
function getPasswordResetSmsTemplate(resetUrl: string, language: SMSLanguage): string {
  // Consider using a URL shortener for SMS if resetUrl is long
  switch (language) {
    case "he":
      return `לאיפוס הסיסמה שלך ב-${appName}, לחץ על הקישור: ${resetUrl}`
    case "ru":
      return `Для сброса пароля в ${appName} перейдите по ссылке: ${resetUrl}`
    default: // English
      return `To reset your ${appName} password, click the link: ${resetUrl}`
  }
}

// Appointment SMS Template
function getAppointmentSmsTemplate(date: Date, serviceName: string, language: SMSLanguage): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem", // Added timezone
  }
  const localizedDate = date.toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    dateOptions,
  )
  switch (language) {
    case "he":
      return `תזכורת: פגישת ${serviceName} נקבעה ל-${localizedDate}. ${appName}`
    case "ru":
      return `Напоминание: ваша встреча ${serviceName} назначена на ${localizedDate}. ${appName}`
    default: // English
      return `Reminder: Your ${serviceName} appointment is on ${localizedDate}. ${appName}`
  }
}

// Gift Voucher Received SMS Template (for the recipient)
function getGiftVoucherReceivedSmsTemplate(
  recipientName: string,
  purchaserName: string,
  voucherCode: string,
  greetingMessage: string | undefined,
  language: SMSLanguage,
): string {
  const greeting = greetingMessage
    ? language === "he"
      ? ` (${greetingMessage})`
      : language === "ru"
        ? ` (${greetingMessage})`
        : ` (${greetingMessage})`
    : ""
  switch (language) {
    case "he":
      return `${recipientName} היקר/ה, ${purchaserName} שלח/ה לך שובר מתנה${greeting}! קוד: ${voucherCode}. ${appName}`
    case "ru":
      return `Уважаемый(ая) ${recipientName}, ${purchaserName} отправил(а) вам подарочный сертификат${greeting}! Код: ${voucherCode}. ${appName}`
    default: // English
      return `Dear ${recipientName}, ${purchaserName} sent you a gift voucher${greeting}! Code: ${voucherCode}. ${appName}`
  }
}

// Purchase Success Subscription SMS Template
function getPurchaseSuccessSubscriptionSmsTemplate(
  data: PurchaseSuccessSubscriptionNotificationData,
  language: SMSLanguage,
): string {
  // It's good practice to use a URL shortener for links in SMS
  // For now, we'll use the full link.
  switch (language) {
    case "he":
      return `${data.userName} היקר/ה, רכישת מנוי "${data.subscriptionName}" הושלמה בהצלחה! פרטים: ${data.purchaseDetailsLink} ${appName}`
    case "ru":
      return `Уважаемый(ая) ${data.userName}, покупка подписки "${data.subscriptionName}" успешно завершена! Детали: ${data.purchaseDetailsLink} ${appName}`
    default: // English
      return `Dear ${data.userName}, your subscription "${data.subscriptionName}" purchase was successful! Details: ${data.purchaseDetailsLink} ${appName}`
  }
}

// Purchase Success Gift Voucher SMS Template (for the purchaser)
function getPurchaseSuccessGiftVoucherSmsTemplate(
  data: PurchaseSuccessGiftVoucherNotificationData,
  language: SMSLanguage,
): string {
  const voucherDesc =
    data.voucherType === "treatment"
      ? data.treatmentName ||
        (language === "he" ? "שובר טיפול" : language === "ru" ? "сертификат на процедуру" : "treatment voucher")
      : `${data.voucherValue} ILS ${language === "he" ? "שובר כספי" : language === "ru" ? "денежный сертификат" : "monetary voucher"}`
  switch (language) {
    case "he":
      return `${data.userName} היקר/ה, רכישת ${voucherDesc} (קוד: ${data.voucherCode}) הושלמה בהצלחה! פרטים: ${data.purchaseDetailsLink} ${appName}`
    case "ru":
      return `Уважаемый(ая) ${data.userName}, покупка ${voucherDesc} (код: ${data.voucherCode}) успешно завершена! Детали: ${data.purchaseDetailsLink} ${appName}`
    default: // English
      return `Dear ${data.userName}, your purchase of ${voucherDesc} (code: ${data.voucherCode}) was successful! Details: ${data.purchaseDetailsLink} ${appName}`
  }
}

// Booking Success SMS Template (for user)
function getBookingSuccessSmsTemplate(data: BookingSuccessNotificationData, language: SMSLanguage): string {
  const dateTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" },
  )
  const dateDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" },
  )

  switch (language) {
    case "he":
      return `הזמנתך לטיפול ${data.treatmentName} ב-${dateDate} בשעה ${dateTime} (מס' ${data.bookingId}) אושרה! פרטים נוספים: ${data.orderDetailsLink} ${appName}`
    case "ru":
      return `Ваш заказ на ${data.treatmentName} ${dateDate} в ${dateTime} (№${data.bookingId}) подтвержден! Подробнее: ${data.orderDetailsLink} ${appName}`
    default: // English
      return `Your booking for ${data.treatmentName} on ${dateDate} at ${dateTime} (#${data.bookingId}) is confirmed! Details: ${data.orderDetailsLink} ${appName}`
  }
}

// New Booking Available SMS Template (for professionals) - Updated
function getNewBookingAvailableSmsTemplate(data: NewBookingAvailableNotificationData, language: SMSLanguage): string {
  const dateTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" },
  )
  const dateDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" },
  )
  const locationInfo = data.bookingAddress
    ? language === "he"
      ? ` ב${data.bookingAddress}`
      : language === "ru"
        ? ` в ${data.bookingAddress}`
        : ` at ${data.bookingAddress}`
    : ""

  switch (language) {
    case "he":
      return `הזמנה חדשה: ${data.treatmentName} ב-${dateDate} ${dateTime}${locationInfo} (מס' ${data.bookingId}). לניהול: ${data.professionalActionLink} ${appName}`
    case "ru":
      return `Новый заказ: ${data.treatmentName} ${dateDate} в ${dateTime}${locationInfo} (№${data.bookingId}). Управлять: ${data.professionalActionLink} ${appName}`
    default: // English
      return `New booking: ${data.treatmentName} on ${dateDate} at ${dateTime}${locationInfo} (#${data.bookingId}). Manage: ${data.professionalActionLink} ${appName}`
  }
}

// Booking Confirmed by Professional SMS Template (for client)
function getBookingConfirmedClientSmsTemplate(
  data: BookingConfirmedClientNotificationData,
  language: SMSLanguage,
): string {
  const dateTime = new Date(data.bookingDateTime).toLocaleTimeString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" },
  )
  const dateDate = new Date(data.bookingDateTime).toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" },
  )
  switch (language) {
    case "he":
      return `הזמנתך ל${data.treatmentName} ב-${dateDate} ${dateTime} אושרה ע"י ${data.professionalName}! פרטים: ${data.bookingDetailsLink} ${appName}`
    case "ru":
      return `Ваш заказ на ${data.treatmentName} ${dateDate} в ${dateTime} подтвержден ${data.professionalName}! Детали: ${data.bookingDetailsLink} ${appName}`
    default: // English
      return `Your booking for ${data.treatmentName} on ${dateDate} at ${dateTime} is confirmed by ${data.professionalName}! Details: ${data.bookingDetailsLink} ${appName}`
  }
}

// Professional En Route SMS Template (for client)
function getProfessionalEnRouteClientSmsTemplate(
  data: ProfessionalEnRouteClientNotificationData,
  language: SMSLanguage,
): string {
  switch (language) {
    case "he":
      return `${data.professionalName} בדרך אליך לטיפול ${data.treatmentName}. ${appName}`
    case "ru":
      return `${data.professionalName} уже в пути для процедуры ${data.treatmentName}. ${appName}`
    default: // English
      return `${data.professionalName} is on the way for your ${data.treatmentName} treatment. ${appName}`
  }
}

// Booking Completed by Professional SMS Template (for client)
function getBookingCompletedClientSmsTemplate(
  data: BookingCompletedClientNotificationData,
  language: SMSLanguage,
): string {
  switch (language) {
    case "he":
      return `הטיפול ${data.treatmentName} עם ${data.professionalName} הושלם. נשמח למשוב! ${appName}`
    case "ru":
      return `Процедура ${data.treatmentName} со специалистом ${data.professionalName} завершена. Будем рады вашему отзыву! ${appName}`
    default: // English
      return `Your ${data.treatmentName} treatment with ${data.professionalName} is complete. We'd love your feedback! ${appName}`
  }
}
