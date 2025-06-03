import type {
  NotificationData,
  PurchaseSuccessGiftVoucherNotificationData,
  PurchaseSuccessSubscriptionNotificationData,
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
