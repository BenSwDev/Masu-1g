export interface EmailNotificationData {
  type:
    | "welcome"
    | "passwordReset"
    | "inviteUser"
    | "adminPasswordReset"
    | "otp"
  userName?: string
  email?: string
  resetLink?: string
  inviteLink?: string
  organizationName?: string
  code?: string
  expiresIn?: number
}

export const getEmailTemplate = (data: EmailNotificationData, language = "en", userName?: string) => {
  let subject = ""
  let text = ""
  let html = ""
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Masu"
  const emailFrom = process.env.EMAIL_FROM || "Masu" // Used for "The Masu Team"

  const wrapHtml = (content: string, emailSubject: string): string => `
<!DOCTYPE html>
<html lang="${language}" dir="${language === "he" ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8">
<title>${emailSubject}</title>
<style>
body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; direction: ${
    language === "he" ? "rtl" : "ltr"
  }; }
.container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
.header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
.header img { max-width: 150px; } /* Placeholder for logo */
.content { padding: 20px 0; color: #333; line-height: 1.6; }
.button { display: inline-block; padding: 12px 25px; background-color: #007bff; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; }
.footer { padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 0.9em; color: #777; }
p { margin: 10px 0; }
.otp-code { font-size: 24px; font-weight: bold; color: #007bff; text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px; margin: 20px 0; }
</style>
</head>
<body>
<div class="container">
<div class="header">
  <!-- Placeholder for logo -->
 <h2>${appName}</h2>
</div>
<div class="content">
 ${content}
</div>
<div class="footer">
 <p>${
   language === "he"
     ? `אם יש לך שאלות, אנא צור קשר. כל הזכויות שמורות &copy; ${new Date().getFullYear()} ${appName}`
     : language === "ru"
       ? `Если у вас есть вопросы, пожалуйста, свяжитесь с нами. Все права защищены &copy; ${new Date().getFullYear()} ${appName}`
       : `If you have any questions, please contact us. All rights reserved &copy; ${new Date().getFullYear()} ${appName}`
 }</p>
</div>
</div>
</body>
</html>
`

  switch (data.type) {
    case "otp":
      subject =
        language === "he"
          ? `קוד האימות שלך ל-${appName}`
          : language === "ru"
            ? `Ваш код подтверждения для ${appName}`
            : `Your verification code for ${appName}`
      const otpTextContent =
        language === "he"
          ? `שלום,\n\nקוד האימות שלך הוא: ${data.code}\nהקוד תקף ל-${data.expiresIn || 10} דקות.\n\nתודה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте,\n\nВаш код подтверждения: ${data.code}\nКод действителен в течение ${data.expiresIn || 10} минут.\n\nСпасибо,\nКоманда ${emailFrom}`
            : `Hello,\n\nYour verification code is: ${data.code}\nThis code is valid for ${data.expiresIn || 10} minutes.\n\nThanks,\nThe ${emailFrom} Team`
      const otpHtmlContent = `
<p>${language === "he" ? "שלום," : language === "ru" ? "Здравствуйте," : "Hello,"}</p>
<p>${language === "he" ? "קוד האימות שלך הוא:" : language === "ru" ? "Ваш код подтверждения:" : "Your verification code is:"}</p>
<div class="otp-code">${data.code}</div>
<p>${language === "he" ? `הקוד תקף ל-${data.expiresIn || 10} דקות.` : language === "ru" ? `Код действителен в течение ${data.expiresIn || 10} минут.` : `This code is valid for ${data.expiresIn || 10} minutes.`}</p>
<p>${language === "he" ? "תודה," : language === "ru" ? "Спасибо," : "Thanks,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = otpTextContent
      html = wrapHtml(otpHtmlContent, subject)
      break

    case "welcome":
      subject =
        language === "he"
          ? `ברוך הבא ל-${appName}!`
          : language === "ru"
            ? `Добро пожаловать в ${appName}!`
            : `Welcome to ${appName}!`
      const welcomeTextContent =
        language === "he"
          ? `שלום ${data.userName || userName},\n\nברוך הבא ל-${appName}!\n\nתודה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName || userName},\n\nДобро пожаловать в ${appName}!\n\nСпасибо,\nКоманда ${emailFrom}`
            : `Hello ${data.userName || userName},\n\nWelcome to ${appName}!\n\nThanks,\nThe ${emailFrom} Team`
      const welcomeHtmlContent = `
<p>${language === "he" ? `שלום ${data.userName || userName},` : language === "ru" ? `Здравствуйте, ${data.userName || userName},` : `Hello ${data.userName || userName},`}</p>
<p>${language === "he" ? `ברוך הבא ל-${appName}!` : language === "ru" ? `Добро пожаловать в ${appName}!` : `Welcome to ${appName}!`}</p>
<p>${language === "he" ? "תודה," : language === "ru" ? "Спасибо," : "Thanks,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = welcomeTextContent
      html = wrapHtml(welcomeHtmlContent, subject)
      break

    case "passwordReset":
      subject =
        language === "he"
          ? `איפוס סיסמה עבור ${data.userName || userName}`
          : language === "ru"
            ? `Сброс пароля для ${data.userName || userName}`
            : `Password Reset for ${data.userName || userName}`
      const passwordResetTextContent =
        language === "he"
          ? `שלום ${data.userName || userName},\n\nאנא לחץ על הקישור הבא לאיפוס סיסמתך: ${data.resetLink}\n\nאם לא ביקשת זאת, אנא התעלם ממייל זה.\n\nתודה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName || userName},\n\nПожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль: ${data.resetLink}\n\nЕсли вы не запрашивали это, пожалуйста, проигнорируйте это письмо.\n\nСпасибо,\nКоманда ${emailFrom}`
            : `Hello ${data.userName || userName},\n\nPlease click the following link to reset your password: ${data.resetLink}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe ${emailFrom} Team`
      const passwordResetHtmlContent = `
<p>${language === "he" ? `שלום ${data.userName || userName},` : language === "ru" ? `Здравствуйте, ${data.userName || userName},` : `Hello ${data.userName || userName},`}</p>
<p>${language === "he" ? "אנא לחץ על הקישור הבא לאיפוס סיסמתך:" : language === "ru" ? "Пожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль:" : "Please click the link below to reset your password:"}</p>
<p style="text-align: center; margin: 20px 0;"><a href="${data.resetLink}" class="button">${language === "he" ? "אפס סיסמה" : language === "ru" ? "Сбросить пароль" : "Reset Password"}</a></p>
<p>${language === "he" ? "אם לא ביקשת זאת, אנא התעלם ממייל זה." : language === "ru" ? "Если вы не запрашивали это, пожалуйста, проигнорируйте это письмо." : "If you did not request this, please ignore this email."}</p>
<p>${language === "he" ? "תודה," : language === "ru" ? "Спасибо," : "Thanks,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = passwordResetTextContent
      html = wrapHtml(passwordResetHtmlContent, subject)
      break

    case "inviteUser":
      subject =
        language === "he"
          ? `הוזמנת ל-${data.organizationName}`
          : language === "ru"
            ? `Вас пригласили в ${data.organizationName}`
            : `You're invited to ${data.organizationName}`
      const inviteUserTextContent = `Hello ${data.userName || userName},\n\nYou have been invited to join ${data.organizationName} on ${appName}.\n\nPlease click the following link to accept the invitation: ${data.inviteLink}\n\nThanks,\nThe ${emailFrom} Team`
      const inviteUserHtmlContent = `
<p>Hello ${data.userName || userName},</p>
<p>You have been invited to join ${data.organizationName} on ${appName}.</p>
<p>Please click the link below to accept the invitation:</p>
<p style="text-align: center; margin: 20px 0;"><a href="${data.inviteLink}" class="button">Accept Invitation</a></p>
<p>Thanks,<br/>The ${emailFrom} Team</p>
`
      text = inviteUserTextContent
      html = wrapHtml(inviteUserHtmlContent, subject)
      break

    case "adminPasswordReset":
      subject =
        language === "he"
          ? `איפוס סיסמה למנהל עבור ${data.userName || userName}`
          : language === "ru"
            ? `Сброс пароля администратора для ${data.userName || userName}`
            : `Admin Password Reset for ${data.userName || userName}`
      const adminPasswordResetTextContent =
        language === "he"
          ? `שלום ${data.userName || userName},\n\nמנהל המערכת ביקש לאפס את סיסמתך.\nאנא לחץ על הקישור הבא לאיפוס סיסמתך: ${data.resetLink}\n\nתודה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName || userName},\n\nАдминистратор системы запросил сброс вашего пароля.\nПожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль: ${data.resetLink}\n\nСпасибо,\nКоманда ${emailFrom}`
            : `Hello ${data.userName || userName},\n\nA system administrator has requested to reset your password.\nPlease click the following link to reset your password: ${data.resetLink}\n\nThanks,\nThe ${emailFrom} Team`
      const adminPasswordResetHtmlContent = `
<p>${language === "he" ? `שלום ${data.userName || userName},` : language === "ru" ? `Здравствуйте, ${data.userName || userName},` : `Hello ${data.userName || userName},`}</p>
<p>${language === "he" ? "מנהל המערכת ביקש לאפס את סיסמתך." : language === "ru" ? "Администратор системы запросил сброс вашего пароля." : "A system administrator has requested to reset your password."}</p>
<p>${language === "he" ? "אנא לחץ על הקישור הבא לאיפוס סיסמתך:" : language === "ru" ? "Пожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль:" : "Please click the link below to reset your password:"}</p>
<p style="text-align: center; margin: 20px 0;"><a href="${data.resetLink}" class="button">${language === "he" ? "אפס סיסמה" : language === "ru" ? "Сбросить пароль" : "Reset Password"}</a></p>
<p>${language === "he" ? "תודה," : language === "ru" ? "Спасибо," : "Thanks,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = adminPasswordResetTextContent
      html = wrapHtml(adminPasswordResetHtmlContent, subject)
      break

    default:
      subject = language === "he" ? "הודעה" : language === "ru" ? "Уведомление" : "Notification"
      const defaultTextContent =
        language === "he"
          ? `שלום,\n\nזוהי הודעה מ-${appName}.`
          : language === "ru"
            ? `Здравствуйте,\n\nЭто уведомление от ${appName}.`
            : `Hello,\n\nThis is a notification from ${appName}.`
      const defaultHtmlContent = `<p>${language === "he" ? "שלום," : language === "ru" ? "Здравствуйте," : "Hello,"}</p><p>${language === "he" ? `זוהי הודעה מ-${appName}.` : language === "ru" ? `Это уведомление от ${appName}.` : `This is a notification from ${appName}.`}</p>`
      text = defaultTextContent
      html = wrapHtml(defaultHtmlContent, subject)
      break
  }

  return { subject, text, html }
}
