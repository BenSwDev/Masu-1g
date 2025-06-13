import type { NotificationData } from "../notification-types"

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
