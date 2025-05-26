import type { NotificationData } from "../notification-types"

// Define Language type locally to avoid importing from client-side i18n
type SMSLanguage = "he" | "en" | "ru"

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

    case "custom":
      return data.message

    default:
      return "You have received a notification from Masu."
  }
}

// OTP SMS Template
function getOTPSmsTemplate(code: string, expiresIn: number, language: SMSLanguage): string {
  switch (language) {
    case "he":
      return `קוד האימות שלך ל-Masu הוא: ${code}. הקוד תקף ל-${expiresIn} דקות.`

    case "ru":
      return `Ваш код подтверждения Masu: ${code}. Код действителен в течение ${expiresIn} минут.`

    default: // English
      return `Your Masu verification code is: ${code}. Valid for ${expiresIn} minutes.`
  }
}

// Welcome SMS Template
function getWelcomeSmsTemplate(language: SMSLanguage): string {
  switch (language) {
    case "he":
      return "ברוך הבא ל-Masu! תודה שנרשמת. אנחנו שמחים לראות אותך כאן."

    case "ru":
      return "Добро пожаловать в Masu! Спасибо за регистрацию. Мы рады видеть вас здесь."

    default: // English
      return "Welcome to Masu! Thanks for signing up. We're excited to have you on board."
  }
}

// Password Reset SMS Template
function getPasswordResetSmsTemplate(resetUrl: string, language: SMSLanguage): string {
  switch (language) {
    case "he":
      return `לאיפוס הסיסמה שלך ב-Masu, לחץ על הקישור: ${resetUrl}`

    case "ru":
      return `Для сброса пароля в Masu перейдите по ссылке: ${resetUrl}`

    default: // English
      return `To reset your Masu password, click the link: ${resetUrl}`
  }
}

// Appointment SMS Template
function getAppointmentSmsTemplate(date: Date, serviceName: string, language: SMSLanguage): string {
  // Format date based on language
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
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
      return `תזכורת: יש לך פגישה ${serviceName} ב-${localizedDate}. Masu`

    case "ru":
      return `Напоминание: у вас встреча ${serviceName} ${localizedDate}. Masu`

    default: // English
      return `Reminder: You have a ${serviceName} appointment on ${localizedDate}. Masu`
  }
}
