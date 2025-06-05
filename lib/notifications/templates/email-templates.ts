export interface EmailNotificationData {
  type:
    | "welcome"
    | "passwordReset"
    | "inviteUser"
    | "adminPasswordReset"
    | "GIFT_VOUCHER_RECEIVED" // Added to match potential usage
    | "PURCHASE_SUCCESS_SUBSCRIPTION" // New
    | "PURCHASE_SUCCESS_GIFT_VOUCHER" // New
  userName?: string // Made optional as not all types use it directly (e.g. GIFT_VOUCHER_RECEIVED uses recipientName)
  email?: string // Made optional
  resetLink?: string
  inviteLink?: string
  organizationName?: string
  // Fields for GIFT_VOUCHER_RECEIVED
  recipientName?: string
  purchaserName?: string
  voucherCode?: string
  greetingMessage?: string
  // Fields for PURCHASE_SUCCESS_SUBSCRIPTION
  subscriptionName?: string
  purchaseDetailsLink?: string
  // Fields for PURCHASE_SUCCESS_GIFT_VOUCHER
  voucherType?: "monetary" | "treatment"
  treatmentName?: string
  voucherValue?: number
  // voucherCode is already defined above
  // purchaseDetailsLink is already defined above
  bookingId?: string
  orderDetailsLink?: string
  bookingAddress?: string
  adminBookingDetailsLink?: string
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
    <p>${language === "he" ? "אם לא ביקשת זאת, אנא התעלם ממייל זה." : language === "ru" ? "Если вы не запрашивали это, пожалуйста, проигнорируйте это письмо." : "If you did not request this, please ignore this email."}</p>
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
          ? `שלום ${data.userName},\n\nהזמנתך מספר ${data.bookingId} לטיפול "${data.treatmentName}" בתאריך ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("he-IL") : ""} אושרה בהצלחה.\nתוכל לצפות בפרטי ההזמנה כאן: ${data.orderDetailsLink}\n\nבברכה,\nצוות ${emailFrom}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName},\n\nВаш заказ №${data.bookingId} на процедуру "${data.treatmentName}" ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("ru-RU") : ""} успешно подтвержден.\nВы можете просмотреть детали заказа здесь: ${data.orderDetailsLink}\n\nС уважением,\nКоманда ${emailFrom}`
            : `Hello ${data.userName},\n\nYour booking #${data.bookingId} for "${data.treatmentName}" on ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("en-US") : ""} has been successfully confirmed.\nYou can view your booking details here: ${data.orderDetailsLink}\n\nRegards,\nThe ${emailFrom} Team`
      const bookingSuccessHtml = `
      <p>${language === "he" ? `שלום ${data.userName},` : language === "ru" ? `Здравствуйте, ${data.userName},` : `Hello ${data.userName},`}</p>
      <p>${language === "he" ? `הזמנתך מספר <strong>${data.bookingId}</strong> לטיפול "<strong>${data.treatmentName}</strong>" בתאריך <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US") : ""}</strong> אושרה בהצלחה.` : language === "ru" ? `Ваш заказ №<strong>${data.bookingId}</strong> на процедуру "<strong>${data.treatmentName}</strong>" <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US") : ""}</strong> успешно подтвержден.` : `Your booking #<strong>${data.bookingId}</strong> for "<strong>${data.treatmentName}</strong>" on <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US") : ""}</strong> has been successfully confirmed.`}</p>
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
          ? `הזמנה חדשה זמינה לשיבוץ: ${data.treatmentName}`
          : language === "ru"
            ? `Новый заказ доступен для назначения: ${data.treatmentName}`
            : `New Booking Available for Assignment: ${data.treatmentName}`
      const newBookingText =
        language === "he"
          ? `שלום${data.professionalName ? ` ${data.professionalName}` : ""},\n\nהזמנה חדשה (מספר ${data.bookingId}) לטיפול "${data.treatmentName}" התקבלה בתאריך ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("he-IL") : ""}${data.bookingAddress ? ` במיקום: ${data.bookingAddress}` : ""}.\nאנא בדוק את פרטי ההזמנה וטפל בשיבוץ: ${data.adminBookingDetailsLink}\n\nבברכה,\nצוות ${appName}`
          : language === "ru"
            ? `Здравствуйте${data.professionalName ? `, ${data.professionalName}` : ""},\n\nПоступил новый заказ (№${data.bookingId}) на процедуру "${data.treatmentName}" на ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("ru-RU") : ""}${data.bookingAddress ? ` по адресу: ${data.bookingAddress}` : ""}.\nПожалуйста, проверьте детали заказа и назначьте исполнителя: ${data.adminBookingDetailsLink}\n\nС уважением,\nКоманда ${appName}`
            : `Hello${data.professionalName ? ` ${data.professionalName}` : ""},\n\nA new booking (#${data.bookingId}) for "${data.treatmentName}" has been received for ${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString("en-US") : ""}${data.bookingAddress ? ` at location: ${data.bookingAddress}` : ""}.\nPlease review the booking details and assign a professional: ${data.adminBookingDetailsLink}\n\nRegards,\nThe ${appName} Team`
      const newBookingHtml = `
      <p>${language === "he" ? `שלום${data.professionalName ? ` ${data.professionalName}` : ""},` : language === "ru" ? `Здравствуйте${data.professionalName ? `, ${data.professionalName}` : ""},` : `Hello${data.professionalName ? ` ${data.professionalName}` : ""},`}</p>
      <p>${language === "he" ? `הזמנה חדשה (מספר <strong>${data.bookingId}</strong>) לטיפול "<strong>${data.treatmentName}</strong>" התקבלה בתאריך <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US") : ""}</strong>${data.bookingAddress ? ` במיקום: <strong>${data.bookingAddress}</strong>` : ""}.` : language === "ru" ? `Поступил новый заказ (№<strong>${data.bookingId}</strong>) на процедуру "<strong>${data.treatmentName}</strong>" на <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US") : ""}</strong>${data.bookingAddress ? ` по адресу: <strong>${data.bookingAddress}</strong>` : ""}.` : `A new booking (#<strong>${data.bookingId}</strong>) for "<strong>${data.treatmentName}</strong>" has been received for <strong>${data.bookingDateTime ? new Date(data.bookingDateTime).toLocaleString(language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US") : ""}</strong>${data.bookingAddress ? ` at location: <strong>${data.bookingAddress}</strong>` : ""}.`}</p>
      <p>${language === "he" ? "אנא בדוק את פרטי ההזמנה וטפל בשיבוץ:" : language === "ru" ? "Пожалуйста, проверьте детали заказа и назначьте исполнителя:" : "Please review the booking details and assign a professional:"}</p>
      <p style="text-align: center; margin: 20px 0;"><a href="${data.adminBookingDetailsLink}" class="button">${language === "he" ? "נהל הזמנות" : language === "ru" ? "Управление заказами" : "Manage Bookings"}</a></p>
      <p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Regards,"}<br/>${language === "he" ? `צוות ${appName}` : language === "ru" ? `Команда ${appName}` : `The ${appName} Team`}</p>
    `
      text = newBookingText
      html = wrapHtml(newBookingHtml, subject)
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
