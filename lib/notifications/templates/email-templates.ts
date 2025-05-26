import type { NotificationData } from "../notification-types"

// Define Language type locally to avoid importing from client-side i18n
type EmailLanguage = "he" | "en" | "ru"

// Server-safe direction function
function getEmailDirection(language: EmailLanguage): "rtl" | "ltr" {
  return language === "he" ? "rtl" : "ltr"
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/**
 * Get email template based on notification type and language
 * @param data Notification data
 * @param language Language code
 * @param recipientName Optional recipient name
 * @returns Email template with subject, HTML and text content
 */
export function getEmailTemplate(
  data: NotificationData,
  language: EmailLanguage = "en",
  recipientName?: string,
): EmailTemplate {
  const dir = getEmailDirection(language)
  const isRTL = dir === "rtl"
  const textAlign = isRTL ? "right" : "left"

  // Common email wrapper
  const wrapHtml = (content: string, subject: string): string => `
    <!DOCTYPE html>
    <html lang="${language}" dir="${dir}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          text-align: ${textAlign};
          direction: ${dir};
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #0cd6d0;
          padding: 15px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #ffffff;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .code {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 6px;
          text-align: center;
          margin: 20px 0;
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          margin: 15px 0;
          background-color: #0cd6d0;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          text-align: center;
          font-weight: bold;
        }
        .button:hover {
          background-color: #0bb5b0;
        }
        .highlight {
          color: #0cd6d0;
          font-weight: bold;
        }
        .url-fallback {
          word-break: break-all;
          font-size: 12px;
          color: #666;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: white; margin: 0;">Masu</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          ${getFooterText(language)} &copy; ${new Date().getFullYear()} Masu
        </div>
      </div>
    </body>
    </html>
  `

  // Switch based on notification type
  switch (data.type) {
    case "otp":
      return getOTPTemplate(data.code, data.expiresIn || 10, language, recipientName, wrapHtml)

    case "welcome":
      return getWelcomeTemplate(language, recipientName || "", wrapHtml)

    case "password-reset":
      return getPasswordResetTemplate(data.resetUrl, data.expiresIn || 60, language, recipientName, wrapHtml)

    case "appointment":
      return getAppointmentTemplate(data.date, data.serviceName, data.location, language, recipientName, wrapHtml)

    case "custom":
      return getCustomTemplate(data.message, data.subject, data.title, language, recipientName, wrapHtml)

    default:
      return {
        subject: "Masu Notification",
        html: wrapHtml("<p>You have received a notification from Masu.</p>", "Masu Notification"),
        text: "You have received a notification from Masu.",
      }
  }
}

// OTP Email Template
function getOTPTemplate(
  code: string,
  expiresIn: number,
  language: EmailLanguage,
  recipientName?: string,
  wrapHtml?: (content: string, subject: string) => string,
): EmailTemplate {
  let subject: string
  let greeting: string
  let message1: string
  let message2: string
  let expiryMessage: string

  // Localized strings
  switch (language) {
    case "he":
      subject = "קוד האימות שלך ל-Masu"
      greeting = recipientName ? `שלום ${recipientName},` : "שלום,"
      message1 = "הקוד החד-פעמי שלך הוא:"
      message2 = "השתמש בקוד זה כדי להשלים את תהליך האימות שלך."
      expiryMessage = `קוד זה יפוג תוך ${expiresIn} דקות.`
      break

    case "ru":
      subject = "Ваш код подтверждения Masu"
      greeting = recipientName ? `Здравствуйте, ${recipientName},` : "Здравствуйте,"
      message1 = "Ваш одноразовый код:"
      message2 = "Используйте этот код для завершения процесса проверки."
      expiryMessage = `Этот код истекает через ${expiresIn} минут.`
      break

    default: // English
      subject = "Your Masu Verification Code"
      greeting = recipientName ? `Hello ${recipientName},` : "Hello,"
      message1 = "Your one-time verification code is:"
      message2 = "Use this code to complete your verification process."
      expiryMessage = `This code expires in ${expiresIn} minutes.`
  }

  const htmlContent = `
    <p>${greeting}</p>
    <p>${message1}</p>
    <div class="code">${code}</div>
    <p>${message2}</p>
    <p style="font-size: 12px; color: #666;">${expiryMessage}</p>
  `

  const textContent = `
${greeting}

${message1} ${code}

${message2}

${expiryMessage}
  `.trim()

  return {
    subject,
    html: wrapHtml ? wrapHtml(htmlContent, subject) : htmlContent,
    text: textContent,
  }
}

// Welcome Email Template
function getWelcomeTemplate(
  language: EmailLanguage,
  recipientName: string,
  wrapHtml?: (content: string, subject: string) => string,
): EmailTemplate {
  let subject: string
  let greeting: string
  let message1: string
  let message2: string
  let ctaText: string

  // Localized strings
  switch (language) {
    case "he":
      subject = "ברוך הבא ל-Masu!"
      greeting = recipientName ? `שלום ${recipientName},` : "שלום,"
      message1 = "תודה שנרשמת ל-Masu! אנחנו שמחים לראות אותך כאן."
      message2 = "אם יש לך שאלות כלשהן, אל תהסס לפנות אלינו."
      ctaText = "התחל להשתמש ב-Masu"
      break

    case "ru":
      subject = "Добро пожаловать в Masu!"
      greeting = recipientName ? `Здравствуйте, ${recipientName},` : "Здравствуйте,"
      message1 = "Спасибо за регистрацию в Masu! Мы рады видеть вас здесь."
      message2 = "Если у вас есть какие-либо вопросы, не стесняйтесь обращаться к нам."
      ctaText = "Начать использовать Masu"
      break

    default: // English
      subject = "Welcome to Masu!"
      greeting = recipientName ? `Hello ${recipientName},` : "Hello,"
      message1 = "Thank you for signing up for Masu! We're excited to have you on board."
      message2 = "If you have any questions, please don't hesitate to reach out."
      ctaText = "Start Using Masu"
  }

  const htmlContent = `
    <p>${greeting}</p>
    <p>${message1}</p>
    <p>${message2}</p>
    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}" class="button">${ctaText}</a>
    </div>
  `

  const textContent = `
${greeting}

${message1}

${message2}

${ctaText}: ${process.env.NEXTAUTH_URL}
  `.trim()

  return {
    subject,
    html: wrapHtml ? wrapHtml(htmlContent, subject) : htmlContent,
    text: textContent,
  }
}

// Password Reset Email Template
function getPasswordResetTemplate(
  resetUrl: string,
  expiresIn: number,
  language: EmailLanguage,
  recipientName?: string,
  wrapHtml?: (content: string, subject: string) => string,
): EmailTemplate {
  let subject: string
  let greeting: string
  let message1: string
  let message2: string
  let message3: string
  let expiryMessage: string
  let ctaText: string
  let ignoreMessage: string

  // Localized strings
  switch (language) {
    case "he":
      subject = "איפוס סיסמה ל-Masu"
      greeting = recipientName ? `שלום ${recipientName},` : "שלום,"
      message1 = "קיבלנו בקשה לאיפוס הסיסמה שלך."
      message2 = "לחץ על הכפתור למטה כדי לאפס את הסיסמה שלך:"
      message3 = "אם אתה לא ביקשת לאפס את הסיסמה, אתה יכול להתעלם מהודעה זו."
      expiryMessage = `קישור זה יפוג תוך ${expiresIn} דקות.`
      ctaText = "איפוס סיסמה"
      ignoreMessage = "אם אינך יכול ללחוץ על הכפתור, העתק את הקישור הבא לדפדפן שלך:"
      break

    case "ru":
      subject = "Сброс пароля для Masu"
      greeting = recipientName ? `Здравствуйте, ${recipientName},` : "Здравствуйте,"
      message1 = "Мы получили запрос на сброс вашего пароля."
      message2 = "Нажмите на кнопку ниже, чтобы сбросить пароль:"
      message3 = "Если вы не запрашивали сброс пароля, вы можете игнорировать это сообщение."
      expiryMessage = `Эта ссылка истекает через ${expiresIn} минут.`
      ctaText = "Сбросить пароль"
      ignoreMessage = "Если вы не можете нажать на кнопку, скопируйте следующую ссылку в свой браузер:"
      break

    default: // English
      subject = "Password Reset for Masu"
      greeting = recipientName ? `Hello ${recipientName},` : "Hello,"
      message1 = "We received a request to reset your password."
      message2 = "Click the button below to reset your password:"
      message3 = "If you didn't request a password reset, you can ignore this message."
      expiryMessage = `This link expires in ${expiresIn} minutes.`
      ctaText = "Reset Password"
      ignoreMessage = "If you can't click the button, copy the following link to your browser:"
  }

  const htmlContent = `
    <p>${greeting}</p>
    <p>${message1}</p>
    <p>${message2}</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="${resetUrl}" class="button">${ctaText}</a>
    </div>
    <p style="font-size: 12px; color: #666;">${expiryMessage}</p>
    <p style="font-size: 12px; color: #666;">${ignoreMessage}</p>
    <div class="url-fallback">${resetUrl}</div>
    <p>${message3}</p>
  `

  const textContent = `
${greeting}

${message1}

${message2}

${ctaText}: ${resetUrl}

${expiryMessage}

${message3}
  `.trim()

  return {
    subject,
    html: wrapHtml ? wrapHtml(htmlContent, subject) : htmlContent,
    text: textContent,
  }
}

// Appointment Email Template
function getAppointmentTemplate(
  date: Date,
  serviceName: string,
  location: string | undefined,
  language: EmailLanguage,
  recipientName?: string,
  wrapHtml?: (content: string, subject: string) => string,
): EmailTemplate {
  let subject: string
  let greeting: string
  let reminderText: string
  let dateLabel: string
  let serviceLabel: string
  let locationLabel: string
  let message: string

  // Format date based on language
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }

  const localizedDate = date.toLocaleDateString(
    language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
    dateOptions,
  )

  // Localized strings
  switch (language) {
    case "he":
      subject = `תזכורת לפגישה: ${serviceName}`
      greeting = recipientName ? `שלום ${recipientName},` : "שלום,"
      reminderText = "זוהי תזכורת לפגישה הקרובה שלך:"
      dateLabel = "תאריך ושעה:"
      serviceLabel = "שירות:"
      locationLabel = "מיקום:"
      message = "אנחנו מצפים לראות אותך."
      break

    case "ru":
      subject = `Напоминание о встрече: ${serviceName}`
      greeting = recipientName ? `Здравствуйте, ${recipientName},` : "Здравствуйте,"
      reminderText = "Это напоминание о вашей предстоящей встрече:"
      dateLabel = "Дата и время:"
      serviceLabel = "Услуга:"
      locationLabel = "Место:"
      message = "Мы с нетерпением ждем встречи с вами."
      break

    default: // English
      subject = `Appointment Reminder: ${serviceName}`
      greeting = recipientName ? `Hello ${recipientName},` : "Hello,"
      reminderText = "This is a reminder of your upcoming appointment:"
      dateLabel = "Date & Time:"
      serviceLabel = "Service:"
      locationLabel = "Location:"
      message = "We look forward to seeing you."
  }

  const htmlContent = `
    <p>${greeting}</p>
    <p>${reminderText}</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
      <p><strong>${dateLabel}</strong> ${localizedDate}</p>
      <p><strong>${serviceLabel}</strong> ${serviceName}</p>
      ${location ? `<p><strong>${locationLabel}</strong> ${location}</p>` : ""}
    </div>
    <p>${message}</p>
  `

  const textContent = `
${greeting}

${reminderText}

${dateLabel} ${localizedDate}
${serviceLabel} ${serviceName}
${location ? `${locationLabel} ${location}` : ""}

${message}
  `.trim()

  return {
    subject,
    html: wrapHtml ? wrapHtml(htmlContent, subject) : htmlContent,
    text: textContent,
  }
}

// Custom Email Template
function getCustomTemplate(
  message: string,
  subject?: string,
  title?: string,
  language: EmailLanguage = "en",
  recipientName?: string,
  wrapHtml?: (content: string, subject: string) => string,
): EmailTemplate {
  // Default subject based on language if not provided
  const defaultSubject = {
    he: "הודעה מ-Masu",
    ru: "Сообщение от Masu",
    en: "Message from Masu",
  }

  const emailSubject = subject || defaultSubject[language]

  // Greeting based on language
  const greeting = {
    he: recipientName ? `שלום ${recipientName},` : "שלום,",
    ru: recipientName ? `Здравствуйте, ${recipientName},` : "Здравствуйте,",
    en: recipientName ? `Hello ${recipientName},` : "Hello,",
  }

  const htmlContent = `
    <p>${greeting[language]}</p>
    ${title ? `<h2 style="color: #0cd6d0;">${title}</h2>` : ""}
    <p>${message.replace(/\n/g, "<br>")}</p>
  `

  const textContent = `
${greeting[language]}

${title ? `${title}\n\n` : ""}${message}
  `.trim()

  return {
    subject: emailSubject,
    html: wrapHtml ? wrapHtml(htmlContent, emailSubject) : htmlContent,
    text: textContent,
  }
}

// Footer text based on language
function getFooterText(language: EmailLanguage): string {
  switch (language) {
    case "he":
      return "אם יש לך שאלות, אנא צור איתנו קשר. כל הזכויות שמורות"
    case "ru":
      return "Если у вас есть вопросы, пожалуйста, свяжитесь с нами. Все права защищены"
    default: // English
      return "If you have any questions, please contact us. All rights reserved"
  }
}
