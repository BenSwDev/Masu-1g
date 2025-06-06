export interface EmailNotificationData {
  type:
    | "welcome"
    | "passwordReset"
    | "inviteUser"
    | "adminPasswordReset"
    | "GIFT_VOUCHER_RECEIVED"
    | "PURCHASE_SUCCESS_SUBSCRIPTION"
    | "PURCHASE_SUCCESS_GIFT_VOUCHER"
    | "BOOKING_SUCCESS" // קיים, עבור משתמש
    | "NEW_BOOKING_AVAILABLE" // קיים, עבור מטפל/מנהל
    | "BOOKING_CONFIRMED_CLIENT" // חדש, עבור לקוח
    | "PROFESSIONAL_EN_ROUTE_CLIENT" // חדש, עבור לקוח
    | "BOOKING_COMPLETED_CLIENT" // חדש, עבור לקוח
  userName?: string
  email?: string
  resetLink?: string
  inviteLink?: string
  organizationName?: string
  recipientName?: string
  purchaserName?: string
  voucherCode?: string
  greetingMessage?: string
  subscriptionName?: string
  purchaseDetailsLink?: string
  voucherType?: "monetary" | "treatment"
  treatmentName?: string
  voucherValue?: number
  bookingId?: string
  orderDetailsLink?: string
  bookingAddress?: string
  professionalActionLink?: string // שינוי שם שדה
  bookingDateTime?: Date
  professionalName?: string
}

export const getEmailTemplate = (data: EmailNotificationData, language = "en") => {
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
</style>
</head>
<body>
<div class="container">
<div class="header">
  място ללוגו בעתיד <!-- <img src="YOUR_LOGO_URL_HERE" alt="${appName} Logo" /> -->
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
    case "welcome":
      subject =
        language === "he"
          ? `ברוך הבא ל${appName}!`
          : language === "ru"
            ? `Добро пожаловать в ${appName}!`
            : `Welcome to ${appName}!`
      const welcomeTextContent =
        language === "he"
          ? `שלום ${data.userName},\n\nברוך הבא ל${appName}!\n\nתודה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nДобро пожаловать в ${appName}!\n\nСпасибо,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nWelcome to ${appName}!\n\nThanks,\nThe ${emailFrom} Team`
      const welcomeHtmlContent = `
<p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
<p>${language === "he" ? `ברוך הבא ל${appName}!` : language === "ru" ? `Добро пожаловать в ${appName}!` : `Welcome to ${appName}!`}</p>
<p>${language === "he" ? "תודה," : language === "ru" ? "Спасибо," : "Thanks,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = welcomeTextContent
      html = wrapHtml(welcomeHtmlContent, subject)
      break

    case "passwordReset":
      subject =
        language === "he"
          ? `איפוס סיסמה עבור ${data.userName}`
          : language === "ru"
            ? `Сброс пароля для ${data.userName}`
            : `Password Reset for ${data.userName}`
      const passwordResetTextContent =
        language === "he"
          ? `שלום ${data.userName},\n\nאנא לחץ על הקישור הבא לאיפוס סיסמתך: ${data.resetLink}\n\nאם לא ביקשת זאת, אנא התעלם ממייל זה.\n\nתודה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nПожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль: ${data.resetLink}\n\nЕсли вы не запрашивали это, пожалуйста, проигнорируйте это письмо.\n\nСпасибо,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nPlease click the following link to reset your password: ${data.resetLink}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe ${emailFrom} Team`
      const passwordResetHtmlContent = `
<p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
<p>${language === "he" ? "אנא לחץ על הקישור הבא לאיפוס סיסמתך:" : language === "ru" ? "Пожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль:" : "Please click the link below to reset your password:"}</p>
<p style="text-align: center; margin: 20px 0;"><a href="${data.resetLink}" class="button">${language === "he" ? "אפס סיסמה" : language === "ru" ? "Сбросить пароль" : "Reset Password"}</a></p>
<p>${language === "he" ? "אם לא ביקשת זאת, אנא התעלם ממייל זה." : language === "ru" ? "Если вы не запрашивали это письмо." : "If you did not request this, please ignore this email."}</p>
<p>${language === "he" ? "תודה," : language === "ru" ? "Спасибо," : "Thanks,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = passwordResetTextContent
      html = wrapHtml(passwordResetHtmlContent, subject)
      break

    case "inviteUser": // Assuming this template remains as is
      subject =
        language === "he"
          ? `הוזמנת ל ${data.organizationName}`
          : language === "ru"
            ? `Вас пригласили в ${data.organizationName}`
            : `You're invited to ${data.organizationName}`
      const inviteUserTextContent = `Hello ${data.userName},\n\nYou have been invited to join ${data.organizationName} on ${appName}.\n\nPlease click the following link to accept the invitation: ${data.inviteLink}\n\nThanks,\nThe ${emailFrom} Team`
      const inviteUserHtmlContent = `
<p>Hello ${data.userName},</p>
<p>You have been invited to join ${data.organizationName} on ${appName}.</p>
<p>Please click the link below to accept the invitation:</p>
<p><a href="${data.inviteLink}" class="button">Accept Invitation</a></p>
<p>Thanks,<br/>The ${emailFrom} Team</p>
`
      text = inviteUserTextContent
      html = wrapHtml(inviteUserHtmlContent, subject)
      break

    case "GIFT_VOUCHER_RECEIVED": // For the recipient of a gift
      subject =
        language === "he"
          ? `קיבלת שובר מתנה מ${data.purchaserName}!`
          : language === "ru"
            ? `Вы получили подарочный сертификат от ${data.purchaserName}!`
            : `You've received a gift voucher from ${data.purchaserName}!`
      const giftReceivedText =
        language === "he"
          ? `שלום ${data.recipientName},\n\n${data.purchaserName} שלח לך שובר מתנה!\nקוד השובר שלך: ${data.voucherCode}\n${data.greetingMessage ? `הודעה אישית: ${data.greetingMessage}\n` : ""}\nתוכל להשתמש בשובר זה ב${appName}.\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.recipientName},\n\n${data.purchaserName} отправил(а) вам подарочный сертификат!\nКод вашего сертификата: ${data.voucherCode}\n${data.greetingMessage ? `Личное сообщение: ${data.greetingMessage}\n` : ""}\nВы можете использовать этот сертификат в ${appName}.\n\nС наилучшими пожеланиями,\nКоманда ${emailFrom}`
            : `Hello ${data.recipientName},\n\n${data.purchaserName} has sent you a gift voucher!\nYour voucher code is: ${data.voucherCode}\n${data.greetingMessage ? `Personal message: ${data.greetingMessage}\n` : ""}\nYou can use this voucher at ${appName}.\n\nBest regards,\nThe ${emailFrom} Team`
      const giftReceivedHtml = `
<p>${language === "he" ? `שלום ${data.recipientName},` : language === "ru" ? `Здравствуйте, ${data.recipientName},` : `Hello ${data.recipientName},`}</p>
<p>${language === "he" ? `${data.purchaserName} שלח לך שובר מתנה!` : language === "ru" ? `${data.purchaserName} отправил(а) вам подарочный сертификат!` : `${data.purchaserName} has sent you a gift voucher!`}</p>
<p>${language === "he" ? "קוד השובר שלך:" : language === "ru" ? "Код вашего сертификата:" : "Your voucher code is:"} <strong>${data.voucherCode}</strong></p>
${data.greetingMessage ? `<p>${language === "he" ? "הודעה אישית:" : language === "ru" ? "Личное сообщение:" : "Personal message:"} <em>${data.greetingMessage}</em></p>` : ""}
<p>${language === "he" ? `תוכל להשתמש בשובר זה ב${appName}.` : language === "ru" ? `Вы можете использовать этот сертификат в ${appName}.` : `You can use this voucher at ${appName}.`}</p>
<p>${language === "he" ? "בברכה," : language === "ru" ? "С наилучшими пожеланиями," : "Best regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = giftReceivedText
      html = wrapHtml(giftReceivedHtml, subject)
      break

    case "BOOKING_SUCCESS":
      subject =
        language === "he"
          ? `הזמנתך לטיפול ${data.treatmentName} אושרה!`
          : language === "ru"
            ? `Ваш заказ на процедуру ${data.treatmentName} подтвержден!`
            : `Your booking for ${data.treatmentName} is confirmed!`
      const bookingSuccessText =
        language === "he"
          ? `שלום ${data.userName},\n\nהזמנתך מספר ${data.bookingId} לטיפול "${data.treatmentName}" בתאריך ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : ""} אושרה בהצלחה.\nתוכל לצפות בפרטי ההזמנה כאן: ${data.orderDetailsLink}\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nВаш заказ №${data.bookingId} на процедуру "${data.treatmentName}" ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("ru-RU", { timeZone: "Asia/Jerusalem" }) : ""} успешно подтвержден.\nВы можете просмотреть детали заказа здесь: ${data.orderDetailsLink}\n\nС уважением,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nYour booking #${data.bookingId} for "${data.treatmentName}" on ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }) : ""} has been successfully confirmed.\nYou can view your booking details here: ${data.orderDetailsLink}\n\nRegards,\nThe ${emailFrom} Team`
      const bookingSuccessHtml = `
  <p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
  <p>${language === "he" ? `הזמנתך מספר <strong>${data.bookingId}</strong> לטיפול "<strong>${data.treatmentName}</strong>" בתאריך <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" }) : ""}</strong> אושרה בהצלחה.` : language === "ru" ? `Ваш заказ №<strong>${data.bookingId}</strong> на процедуру "<strong>${data.treatmentName}</strong>" <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" }) : ""}</strong> успешно подтвержден.` : `Your booking #<strong>${data.bookingId}</strong> for "<strong>${data.treatmentName}</strong>" on <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" }) : ""}</strong> has been successfully confirmed.`}</p>
  <p>${language === "he" ? "תוכל לצפות בפרטי ההזמנה שלך כאן:" : language === "ru" ? "Вы можете просмотреть детали вашего заказа здесь:" : "You can view your booking details here:"}</p>
  <p style="text-align: center; margin: 20px 0;"><a href="${data.orderDetailsLink}" class="button">${language === "he" ? "צפה בהזמנות שלי" : language === "ru" ? "Мои заказы" : "View My Bookings"}</a></p>
  <p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = bookingSuccessText
      html = wrapHtml(bookingSuccessHtml, subject)
      break

    case "NEW_BOOKING_AVAILABLE":
      subject =
        language === "he"
          ? `הזמנה חדשה זמינה: ${data.treatmentName}`
          : language === "ru"
            ? `Новый заказ доступен: ${data.treatmentName}`
            : `New Booking Available: ${data.treatmentName}`
      const newBookingText =
        language === "he"
          ? `שלום${data.professionalName ? ` ${data.professionalName}` : ""},\n\nהזמנה חדשה (מספר ${data.bookingId}) לטיפול "${data.treatmentName}" התקבלה בתאריך ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }) : ""}${data.bookingAddress ? ` במיקום: ${data.bookingAddress}` : ""}.\nאנא לחץ על הקישור לניהול ההזמנה: ${data.professionalActionLink}\n\nבברכה,\nצוות ${appName}`
          : language === "ru"
            ? `Здравствуйте${data.professionalName ? `, ${data.professionalName}` : ""},\n\nПоступил новый заказ (№${data.bookingId}) на процедуру "${data.treatmentName}" на ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("ru-RU", { timeZone: "Asia/Jerusalem" }) : ""}${data.bookingAddress ? ` по адресу: ${data.bookingAddress}` : ""}.\nПожалуйста, нажмите на ссылку для управления заказом: ${data.professionalActionLink}\n\nС уважением,\nКоманда ${appName}`
            : `Hello${data.professionalName ? ` ${data.professionalName}` : ""},\n\nA new booking (#${data.bookingId}) for "${data.treatmentName}" has been received for ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }) : ""}${data.bookingAddress ? ` at location: ${data.bookingAddress}` : ""}.\nPlease click the link to manage the booking: ${data.professionalActionLink}\n\nRegards,\nThe ${appName} Team`
      const newBookingHtml = `
  <p>${language === "he" ? `שלום${data.professionalName ? ` ${data.professionalName}` : ""},` : language === "ru" ? `Здравствуйте${data.professionalName ? `, ${data.professionalName}` : ""},` : `Hello${data.professionalName ? ` ${data.professionalName}` : ""},`}</p>
  <p>${language === "he" ? `הזמנה חדשה (מספר <strong>${data.bookingId}</strong>) לטיפול "<strong>${data.treatmentName}</strong>" התקבלה בתאריך <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" }) : ""}</strong>${data.bookingAddress ? ` במיקום: <strong>${data.bookingAddress}</strong>` : ""}.` : language === "ru" ? `Поступил новый заказ (№<strong>${data.bookingId}</strong>) на процедуру "<strong>${data.treatmentName}</strong>" на <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" }) : ""}</strong>${data.bookingAddress ? ` по адресу: <strong>${data.bookingAddress}</strong>` : ""}.` : `A new booking (#<strong>${data.bookingId}</strong>) for "<strong>${data.treatmentName}</strong>" has been received for <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" }) : ""}</strong>${data.bookingAddress ? ` at location: <strong>${data.bookingAddress}</strong>` : ""}.`}</p>
  <p>${language === "he" ? "אנא לחץ על הקישור לניהול ההזמנה:" : language === "ru" ? "Пожалуйста, нажмите на ссылку для управления заказом:" : "Please click the link to manage the booking:"}</p>
  <p style="text-align: center; margin: 20px 0;"><a href="${data.professionalActionLink}" class="button">${language === "he" ? "נהל הזמנה" : language === "ru" ? "Управление заказом" : "Manage Booking"}</a></p>
  <p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${appName}` : language === "ru" ? `Команда ${appName}` : `The ${appName} Team`}</p>
`
      text = newBookingText
      html = wrapHtml(newBookingHtml, subject)
      break

    case "BOOKING_CONFIRMED_CLIENT":
      subject =
        language === "he"
          ? `הזמנתך אושרה על ידי ${data.professionalName}!`
          : language === "ru"
            ? `Ваш заказ подтвержден ${data.professionalName}!`
            : `Your booking is confirmed by ${data.professionalName}!`
      const confirmedText =
        language === "he"
          ? `שלום ${data.userName},\n\nההזמנה שלך ל${data.treatmentName} בתאריך ${new Date(data.bookingDateTime).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })} אושרה על ידי המטפל/ת ${data.professionalName}.\nתוכל/י לצפות בפרטי ההזמנה כאן: ${data.orderDetailsLink}\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nВаш заказ на ${data.treatmentName} ${new Date(data.bookingDateTime).toLocaleString("ru-RU", { timeZone: "Asia/Jerusalem" })} был подтвержден специалистом ${data.professionalName}.\nДетали заказа: ${data.orderDetailsLink}\n\nС уважением,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nYour booking for ${data.treatmentName} on ${new Date(data.bookingDateTime).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })} has been confirmed by ${data.professionalName}.\nView booking details: ${data.orderDetailsLink}\n\nRegards,\nThe ${emailFrom} Team`
      const confirmedHtml = `
    <p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
    <p>${language === "he" ? `ההזמנה שלך ל<strong>${data.treatmentName}</strong> בתאריך <strong>${new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" })}</strong> אושרה על ידי המטפל/ת <strong>${data.professionalName}</strong>.` : language === "ru" ? `Ваш заказ на <strong>${data.treatmentName}</strong> ${new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" })} был подтвержден специалистом <strong>${data.professionalName}</strong>.` : `Your booking for <strong>${data.treatmentName}</strong> on <strong>${new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US", { timeZone: "Asia/Jerusalem" })}</strong> has been confirmed by <strong>${data.professionalName}</strong>.`}</p>
    <p>${language === "he" ? "תוכל/י לצפות בפרטי ההזמנה שלך כאן:" : language === "ru" ? "Вы можете просмотреть детали вашего заказа здесь:" : "You can view your booking details here:"}</p>
    <p style="text-align: center; margin: 20px 0;"><a href="${data.orderDetailsLink}" class="button">${language === "he" ? "צפה בהזמנה" : language === "ru" ? "Посмотреть заказ" : "View Booking"}</a></p>
    <p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
  `
      text = confirmedText
      html = wrapHtml(confirmedHtml, subject)
      break

    case "PROFESSIONAL_EN_ROUTE_CLIENT":
      subject =
        language === "he"
          ? `${data.professionalName} בדרך אליך!`
          : language === "ru"
            ? `${data.professionalName} уже в пути!`
            : `${data.professionalName} is on the way!`
      const enRouteText =
        language === "he"
          ? `שלום ${data.userName},\n\nהמטפל/ת ${data.professionalName} בדרך לטיפול שלך (${data.treatmentName}).\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nСпециалист ${data.professionalName} уже в пути для проведения процедуры (${data.treatmentName}).\n\nС уважением,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\n${data.professionalName} is on the way for your ${data.treatmentName} treatment.\n\nRegards,\nThe ${emailFrom} Team`
      const enRouteHtml = `
    <p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
    <p>${language === "he" ? `המטפל/ת <strong>${data.professionalName}</strong> בדרך לטיפול שלך (<strong>${data.treatmentName}</strong>).` : language === "ru" ? `Специалист <strong>${data.professionalName}</strong> уже в пути для проведения процедуры (<strong>${data.treatmentName}</strong>).` : `<strong>${data.professionalName}</strong> is on the way for your <strong>${data.treatmentName}</strong> treatment.`}</p>
    <p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
  `
      text = enRouteText
      html = wrapHtml(enRouteHtml, subject)
      break

    case "BOOKING_COMPLETED_CLIENT":
      subject =
        language === "he"
          ? `הטיפול שלך (${data.treatmentName}) הושלם`
          : language === "ru"
            ? `Ваша процедура (${data.treatmentName}) завершена`
            : `Your treatment (${data.treatmentName}) is complete`
      const completedText =
        language === "he"
          ? `שלום ${data.userName},\n\nהטיפול שלך "${data.treatmentName}" עם ${data.professionalName} הושלם בהצלחה.\nנשמח לשמוע איך היה!\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nВаша процедура "${data.treatmentName}" со специалистом ${data.professionalName} успешно завершена.\nМы будем рады услышать ваши впечатления!\n\nС уважением,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nYour treatment "${data.treatmentName}" with ${data.professionalName} has been successfully completed.\nWe'd love to hear your feedback!\n\nRegards,\nThe ${emailFrom} Team`
      const completedHtml = `
    <p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
    <p>${language === "he" ? `הטיפול שלך "<strong>${data.treatmentName}</strong>" עם <strong>${data.professionalName}</strong> הושלם בהצלחה.` : language === "ru" ? `Ваша процедура "<strong>${data.treatmentName}</strong>" со специалистом <strong>${data.professionalName}</strong> успешно завершена.` : `Your treatment "<strong>${data.treatmentName}</strong>" with <strong>${data.professionalName}</strong> has been successfully completed.`}</p>
    <p>${language === "he" ? "נשמח לשמוע איך היה!" : language === "ru" ? "Мы будем рады услышать ваши впечатления!" : "We'd love to hear your feedback!"}</p>
    <p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
  `
      text = completedText
      html = wrapHtml(completedHtml, subject)
      break

    case "PURCHASE_SUCCESS_SUBSCRIPTION":
      subject =
        language === "he"
          ? "רכישת מנוי הושלמה בהצלחה!"
          : language === "ru"
            ? "Покупка подписки успешно завершена!"
            : "Subscription Purchase Successful!"
      const subText =
        language === "he"
          ? `שלום ${data.userName},\n\nתודה על רכישת המנוי "${data.subscriptionName}".\nפרטי המנוי שלך זמינים לצפייה בקישור הבא: ${data.purchaseDetailsLink}\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nСпасибо за покупку подписки "${data.subscriptionName}".\nДетали вашей подписки доступны по следующей ссылке: ${data.purchaseDetailsLink}\n\nС уважением,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nThank you for purchasing the "${data.subscriptionName}" subscription.\nYour subscription details are available at the following link: ${data.purchaseDetailsLink}\n\nRegards,\nThe ${emailFrom} Team`
      const subHtml = `
<p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
<p>${language === "he" ? `תודה על רכישת המנוי "${data.subscriptionName}".` : language === "ru" ? `Спасибо за покупку подписки "${data.subscriptionName}".` : `Thank you for purchasing the "${data.subscriptionName}" subscription.`}</p>
<p>${language === "he" ? "פרטי המנוי שלך זמינים לצפייה בקישור הבא:" : language === "ru" ? "Детали вашей подписки доступны по следующей ссылке:" : "Your subscription details are available at the following link:"}</p>
<p style="text-align: center; margin: 20px 0;"><a href="${data.purchaseDetailsLink}" class="button">${language === "he" ? "צפה במנוי שלי" : language === "ru" ? "Посмотреть мою подписку" : "View My Subscription"}</a></p>
<p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = subText
      html = wrapHtml(subHtml, subject)
      break

    case "PURCHASE_SUCCESS_GIFT_VOUCHER": // For the purchaser
      const voucherDesc =
        data.voucherType === "treatment"
          ? data.treatmentName ||
            (language === "he" ? "שובר טיפול" : language === "ru" ? "сертификат на процедуру" : "treatment voucher")
          : `${data.voucherValue} ILS ${language === "he" ? "שובר כספי" : language === "ru" ? "денежный сертификат" : "monetary voucher"}`
      subject =
        language === "he"
          ? "רכישת שובר מתנה הושלמה בהצלחה!"
          : language === "ru"
            ? "Покупка подарочного сертификата успешно завершена!"
            : "Gift Voucher Purchase Successful!"
      const voucherText =
        language === "he"
          ? `שלום ${data.userName},\n\nתודה על רכישת ${voucherDesc}.\nקוד השובר: ${data.voucherCode}\nפרטי השובר שלך זמינים לצפייה בקישור הבא: ${data.purchaseDetailsLink}\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nСпасибо за покупку ${voucherDesc}.\nКод сертификата: ${data.voucherCode}\nДетали вашего сертификата доступны по следующей ссылке: ${data.purchaseDetailsLink}\n\nС уважением,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nThank you for purchasing a ${voucherDesc}.\nYour voucher code is: ${data.voucherCode}\nYour voucher details are available at the following link: ${data.purchaseDetailsLink}\n\nRegards,\nThe ${emailFrom} Team`
      const voucherHtml = `
<p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
<p>${language === "he" ? `תודה על רכישת ${voucherDesc}.` : language === "ru" ? `Спасибо за покупку ${voucherDesc}.` : `Thank you for purchasing a ${voucherDesc}.`}</p>
<p>${language === "he" ? "קוד השובר:" : language === "ru" ? "Код сертификата:" : "Voucher Code:"} <strong>${data.voucherCode}</strong></p>
<p>${language === "he" ? "פרטי השובר שלך זמינים לצפייה בקישור הבא:" : language === "ru" ? "Детали вашего сертификата доступны по следующей ссылке:" : "Your voucher details are available at the following link:"}</p>
<p style="text-align: center; margin: 20px 0;"><a href="${data.purchaseDetailsLink}" class="button">${language === "he" ? "צפה בשוברים שלי" : language === "ru" ? "Посмотреть мои сертификаты" : "View My Vouchers"}</a></p>
<p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = voucherText
      html = wrapHtml(voucherHtml, subject)
      break

    default:
      subject = language === "he" ? "הודעה" : language === "ru" ? "Уведомление" : "Notification"
      const defaultTextContent =
        language === "he"
          ? `שלום,\n\nזוהי הודעה מ${appName}.`
          : language === "ru"
            ? `Здравствуйте,\n\nЭто уведомление от ${appName}.`
            : `Hello,\n\nThis is a notification from ${appName}.`
      const defaultHtmlContent = `<p>${language === "he" ? "שלום," : language === "ru" ? "Здравствуйте," : "Hello,"}</p><p>${language === "he" ? `זוהי הודעה מ${appName}.` : language === "ru" ? `Это уведомление от ${appName}.` : `This is a notification from ${appName}.`}</p>`
      text = defaultTextContent
      html = wrapHtml(defaultHtmlContent, subject)
      break
  }

  return { subject, text, html }
}
