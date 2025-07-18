export interface EmailNotificationData {
  type:
    | "welcome"
    | "passwordReset"
    | "inviteUser"
    | "adminPasswordReset"
    | "otp"
    | "treatment-booking-success"
    | "professional-booking-notification"
    | "BOOKING_ASSIGNED_PROFESSIONAL"
    | "professional-on-way"
    | "purchase-success"
    | "review-reminder"
    | "review_request"
    | "booking_confirmed"
    | "booking_cancelled"
    | "booking_updated"
    | "professional_assigned"
    | "professional_unassigned"
    | "new_booking_available"
  userName?: string
  email?: string
  resetLink?: string
  inviteLink?: string
  organizationName?: string
  code?: string
  expiresIn?: number
  message?: string // For purchase-success
  reviewLink?: string // For review-reminder
  // Review request fields
  customerName?: string
  reviewUrl?: string
  bookingId?: string
  // Treatment booking fields
  recipientName?: string
  bookerName?: string
  treatmentName?: string
  bookingDateTime?: Date
  bookingNumber?: string
  bookingAddress?: string
  isForSomeoneElse?: boolean
  isBookerForSomeoneElse?: boolean // Added missing field
  actualRecipientName?: string // Added missing field
  // Professional booking notification fields
  responseLink?: string
  responseId?: string // Added to support admin assignment detection
  responseMethod?: string // Added to detect admin assignment vs availability notification
  price?: number
  professionalName?: string
  clientName?: string
  address?: string
  bookingDetailsLink?: string
  // ➕ הוספת פרטי תשלום מפורטים
  priceDetails?: {
    basePrice: number
    surcharges?: Array<{ description: string; amount: number }>
    totalSurchargesAmount: number
    discountAmount?: number
    voucherAppliedAmount?: number
    couponDiscount?: number
    finalAmount: number
    isFullyCoveredByVoucherOrSubscription?: boolean
    appliedCouponCode?: string
    appliedGiftVoucherCode?: string
    redeemedSubscriptionName?: string
  }
  paymentDetails?: {
    paymentStatus: string
    transactionId?: string
    paymentMethod?: string
    cardLast4?: string
  }
  bookingSource?: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption"
  // Additional booking status notification fields
  reason?: string // For cancellations
  changes?: string // For updates
  city?: string // For new booking available
}

export const getEmailTemplate = (data: EmailNotificationData, language = "en", userName?: string) => {
  let subject = ""
  let text = ""
  let html = ""
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Masu"
  const emailFrom = process.env.EMAIL_FROM || "Masu" // Used for "The Masu Team"
  
  // Email signature for text content
  const emailTextSignature = `

────────────────────
לכל שאלה או בעיה ניתן לפנות אלינו בהודעת WhatsApp או בשיחת טלפון למספר הבא:
072-330-3000
בברכה,
צוות מאסו - masu.co.il

להצטרפות למועדון: 
https://www.spaplus.co.il/club/?src=masu

נא לא להגיב להודעה זו`

  const wrapHtml = (content: string, emailSubject: string): string => `
<!DOCTYPE html>
<html lang="${language}" dir="${language === "he" ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${emailSubject}</title>
<style>
/* Reset styles */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
  margin: 0; 
  padding: 0; 
  background-color: #f8f9fa; 
  direction: ${language === "he" ? "rtl" : "ltr"}; 
  line-height: 1.6;
}

/* Container */
.email-container { 
  max-width: 600px; 
  margin: 20px auto; 
  background-color: #ffffff; 
  border-radius: 12px; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
  overflow: hidden;
}

/* Header with brand turquoise colors */
.header { 
  background: linear-gradient(135deg, #0cd6d0 0%, #06aeac 100%);
  padding: 30px 20px; 
  text-align: center; 
  color: white;
  position: relative;
}
.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"%3E%3Cpath d="M1200 120L0 16.48V0h1200v120z" fill="rgba(255,255,255,0.1)"/%3E%3C/svg%3E') no-repeat bottom;
  background-size: 100% 30px;
}
.header-content {
  position: relative;
  z-index: 1;
}
.logo-container {
  display: inline-block;
  margin-bottom: 15px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
.logo {
  height: 50px;
  width: auto;
  max-width: 200px;
}
.header h1 { 
  font-size: 28px; 
  font-weight: 700; 
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.header .tagline { 
  font-size: 14px; 
  opacity: 0.95; 
  font-weight: 300;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* Content area */
.content { 
  padding: 40px 30px; 
  color: #333; 
  line-height: 1.7;
}
.content h2 {
  color: #0cd6d0;
  font-size: 24px;
  margin-bottom: 20px;
  font-weight: 600;
}
.content p { 
  margin: 15px 0; 
  font-size: 16px;
}

/* Booking details card */
.booking-card {
  background: linear-gradient(135deg, #edfffe 0%, #d0fffc 100%);
  border: 2px solid #0cd6d0;
  border-radius: 12px;
  padding: 25px;
  margin: 25px 0;
  text-align: center;
  box-shadow: 0 4px 15px rgba(12, 214, 208, 0.15);
}
.booking-card h3 {
  color: #0cd6d0;
  font-size: 20px;
  margin-bottom: 15px;
  font-weight: 600;
}
.booking-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(12, 214, 208, 0.2);
  margin-bottom: 8px;
}
.booking-detail:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.booking-detail .label {
  font-weight: 600;
  color: #555;
}
.booking-detail .value {
  color: #0cd6d0;
  font-weight: 500;
}

/* Button styles */
.button { 
  display: inline-block; 
  padding: 15px 30px; 
  background: linear-gradient(135deg, #0cd6d0 0%, #06aeac 100%);
  color: white !important; 
  text-decoration: none; 
  border-radius: 8px; 
  font-weight: 600; 
  text-align: center; 
  font-size: 16px;
  box-shadow: 0 4px 15px rgba(12, 214, 208, 0.3);
  transition: all 0.3s ease;
}
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(12, 214, 208, 0.4);
}

/* OTP code styling */
.otp-code { 
  font-size: 32px; 
  font-weight: 700; 
  color: #0cd6d0; 
  text-align: center; 
  padding: 20px; 
  background: linear-gradient(135deg, #edfffe 0%, #d0fffc 100%);
  border: 2px dashed #0cd6d0;
  border-radius: 12px; 
  margin: 25px 0; 
  letter-spacing: 4px;
  box-shadow: 0 4px 15px rgba(12, 214, 208, 0.15);
}

/* Footer */
.footer { 
  background-color: #f8f9fa;
  padding: 25px 30px; 
  text-align: center; 
  font-size: 14px; 
  color: #666; 
  border-top: 1px solid #e9ecef;
}
.footer a {
  color: #0cd6d0;
  text-decoration: none;
}
.footer a:hover {
  color: #06aeac;
  text-decoration: underline;
}

/* Mobile responsive */
@media only screen and (max-width: 600px) {
  .email-container { 
    margin: 10px; 
    border-radius: 8px;
  }
  .header { 
    padding: 20px 15px; 
  }
  .header h1 { 
    font-size: 24px; 
  }
  .content { 
    padding: 25px 20px; 
  }
  .booking-card {
    padding: 20px 15px;
  }
  .booking-detail {
    flex-direction: column;
    align-items: flex-start;
    text-align: ${language === "he" ? "right" : "left"};
  }
  .booking-detail .value {
    margin-top: 5px;
  }
  .otp-code { 
    font-size: 28px; 
    padding: 15px;
    letter-spacing: 2px;
  }
}
</style>
</head>
<body>
<div class="email-container">
<div class="header">
  <div class="header-content">
    <div class="logo-container">
      <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://masu.co.il'}/Masu_logo_big.png" alt="${appName} Logo" class="logo" />
    </div>
    <h1>${appName}</h1>
    <div class="tagline">${language === "he" ? "הטיפולים הטובים ביותר עד הבית" : language === "ru" ? "Лучшие процедуры на дому" : "Premium Home Treatments"}</div>
  </div>
</div>
<div class="content">
 ${content}
</div>
<div class="footer">
 <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
 <p style="margin-bottom: 15px;">
   לכל שאלה או בעיה ניתן לפנות אלינו בהודעת WhatsApp או בשיחת טלפון למספר הבא:<br/>
   <strong>072-330-3000</strong>
 </p>
 <p style="margin-bottom: 15px;">
   בברכה,<br/>
   צוות מאסו - <a href="https://masu.co.il" style="color: #0cd6d0; text-decoration: none;">masu.co.il</a>
 </p>
 <p style="margin-bottom: 15px;">
   להצטרפות למועדון:<br/>
   <a href="https://www.spaplus.co.il/club/?src=masu" style="color: #0cd6d0; text-decoration: none;">https://www.spaplus.co.il/club/?src=masu</a>
 </p>
 <p style="font-size: 12px; color: #999; margin-top: 20px;">
   נא לא להגיב להודעה זו
 </p>
</div>
</div>
</body>
</html>
`

  switch (data.type) {
    case "treatment-booking-success":
      const isForSomeoneElse = data.isForSomeoneElse || false
      const recipientName = data.recipientName || "לקוח יקר"
      const bookerName = data.bookerName || ""
      const treatmentName = data.treatmentName || ""
      const bookingNumber = data.bookingNumber || ""
      const bookingAddress = data.bookingAddress || ""
      
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { 
          weekday: "long",
          day: "2-digit", 
          month: "long", 
          year: "numeric",
          timeZone: "Asia/Jerusalem" 
        }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { 
          hour: "2-digit", 
          minute: "2-digit",
          timeZone: "Asia/Jerusalem" 
        }
      )

      const bookingDetailsLink = `${process.env.NEXT_PUBLIC_APP_URL}/booking-details/${data.bookingNumber}`

      if (isForSomeoneElse) {
        // Email for recipient when someone else booked for them
        subject = language === "he" 
          ? `${bookerName} הזמין עבורך טיפול ב-${appName}!`
          : language === "ru"
            ? `${bookerName} заказал для вас процедуру в ${appName}!`
            : `${bookerName} booked a treatment for you at ${appName}!`
        const treatmentBookingForOtherTextContent = language === "he"
          ? `שלום ${recipientName},\n\n${bookerName} הזמין עבורך טיפול ${treatmentName} לתאריך ${formattedDate} בשעה ${formattedTime} ומחכה לשיוך מטפל/ת.\nבעת האישור הסופי תתקבל הודעת אסמס.\n\nתוכלו לצפות בהזמנה בקישור הבא:\n${bookingDetailsLink}${emailTextSignature}`
          : language === "ru"
            ? `Здравствуйте, ${recipientName},\n\n${bookerName} заказал для вас процедуру ${treatmentName} на ${formattedDate} в ${formattedTime} и ожидает назначения специалиста.\nПри окончательном подтверждении вы получите SMS-уведомление.\n\nВы можете просмотреть заказ по ссылке:\n${bookingDetailsLink}${emailTextSignature}`
            : `Hello ${recipientName},\n\n${bookerName} has booked a ${treatmentName} treatment for you on ${formattedDate} at ${formattedTime} and is waiting for therapist assignment.\nYou will receive an SMS notification upon final confirmation.\n\nYou can view the booking at:\n${bookingDetailsLink}${emailTextSignature}`

        const treatmentBookingForOtherHtmlContent = `
<h2>${language === "he" ? "הזמנת טיפול חדשה!" : language === "ru" ? "Новый заказ на процедуру!" : "New Treatment Booking!"}</h2>
<p>${language === "he" ? `שלום ${recipientName},` : language === "ru" ? `Здравствуйте, ${recipientName},` : `Hello ${recipientName},`}</p>
<p>${language === "he" ? `${bookerName} הזמין עבורך טיפול ${treatmentName} לתאריך ${formattedDate} בשעה ${formattedTime} ומחכה לשיוך מטפל/ת.` : language === "ru" ? `${bookerName} заказал для вас процедуру ${treatmentName} на ${formattedDate} в ${formattedTime} и ожидает назначения специалиста.` : `${bookerName} has booked a ${treatmentName} treatment for you on ${formattedDate} at ${formattedTime} and is waiting for therapist assignment.`}</p>

<div class="booking-card">
  <h3>${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
    <span class="value">${treatmentName}</span>
  </div>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
    <span class="value">${formattedDate}</span>
  </div>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
    <span class="value">${formattedTime}</span>
  </div>
</div>

${data.priceDetails ? `
<div class="booking-card">
  <h3>${language === "he" ? "פרטי תשלום" : language === "ru" ? "Детали оплаты" : "Payment Details"}</h3>
  
  ${data.bookingSource ? `
  <div class="booking-detail">
    <span class="label">${language === "he" ? "מקור ההזמנה:" : language === "ru" ? "Источник заказа:" : "Booking Source:"}</span>
    <span class="value">${
      data.bookingSource === "subscription_redemption" 
        ? (language === "he" ? "מימוש מנוי" : language === "ru" ? "Использование подписки" : "Subscription Redemption")
        : data.bookingSource === "gift_voucher_redemption"
        ? (language === "he" ? "מימוש שובר מתנה" : language === "ru" ? "Использование подарочного ваучера" : "Gift Voucher Redemption") 
        : (language === "he" ? "רכישה חדשה" : language === "ru" ? "Новая покупка" : "New Purchase")
    }</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.redeemedSubscriptionName ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "מנוי בשימוש:" : language === "ru" ? "Используемая подписка:" : "Used Subscription:"}</span>
    <span class="value">${data.priceDetails.redeemedSubscriptionName}</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.appliedGiftVoucherCode ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "שובר מתנה:" : language === "ru" ? "Подарочный ваучер:" : "Gift Voucher:"}</span>
    <span class="value">${data.priceDetails.appliedGiftVoucherCode}</span>
  </div>
  ` : ''}
  
  <div class="booking-detail">
    <span class="label">${language === "he" ? "מחיר בסיס:" : language === "ru" ? "Базовая цена:" : "Base Price:"}</span>
    <span class="value">₪${data.priceDetails.basePrice.toFixed(2)}</span>
  </div>
  
  ${data.priceDetails.surcharges && data.priceDetails.surcharges.length > 0 ? `
  ${data.priceDetails.surcharges.map(surcharge => `
  <div class="booking-detail" style="color: #f59e0b;">
    <span class="label">${surcharge.description === "workingHours.eveningHours" ? (language === "he" ? "תוספת שעות ערב:" : "Evening Hours:") : surcharge.description + ":"}</span>
    <span class="value">+₪${surcharge.amount.toFixed(2)}</span>
  </div>
  `).join('')}
  <div class="booking-detail" style="color: #f59e0b; border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 8px;">
    <span class="label">${language === "he" ? "סה״כ תוספות:" : language === "ru" ? "Всего доплат:" : "Total Surcharges:"}</span>
    <span class="value">+₪${data.priceDetails.totalSurchargesAmount.toFixed(2)}</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.voucherAppliedAmount > 0 ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "שובר מתנה:" : language === "ru" ? "Подарочный ваучер:" : "Gift Voucher:"}</span>
    <span class="value">-₪${data.priceDetails.voucherAppliedAmount.toFixed(2)}</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.couponDiscount > 0 ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "הנחת קופון:" : language === "ru" ? "Скидка по купону:" : "Coupon Discount:"}</span>
    <span class="value">-₪${data.priceDetails.couponDiscount.toFixed(2)}</span>
  </div>
  ` : ''}
  
  <div class="booking-detail" style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px; font-weight: bold; font-size: 18px;">
    <span class="label">${language === "he" ? "סכום לתשלום:" : language === "ru" ? "К оплате:" : "Total Amount:"}</span>
    <span class="value" style="color: #3b82f6;">
      ${data.priceDetails.isFullyCoveredByVoucherOrSubscription 
        ? (language === "he" ? "ללא תשלום" : language === "ru" ? "Бесплатно" : "Free") 
        : "₪" + data.priceDetails.finalAmount.toFixed(2)}
    </span>
  </div>
</div>
` : ''}

${data.paymentDetails ? `
<div class="booking-card">
  <h3>${language === "he" ? "אמצעי תשלום" : language === "ru" ? "Способ оплаты" : "Payment Method"}</h3>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "סטטוס תשלום:" : language === "ru" ? "Статус оплаты:" : "Payment Status:"}</span>
    <span class="value">${
      data.paymentDetails.paymentStatus === 'paid' 
        ? (language === "he" ? "שולם" : language === "ru" ? "Оплачено" : "Paid")
        : data.paymentDetails.paymentStatus === 'pending' 
        ? (language === "he" ? "ממתין לתשלום" : language === "ru" ? "Ожидает оплаты" : "Pending")
        : data.paymentDetails.paymentStatus === 'not_required'
        ? (language === "he" ? "לא נדרש תשלום" : language === "ru" ? "Оплата не требуется" : "No Payment Required")
        : (language === "he" ? "נכשל" : language === "ru" ? "Неуспешно" : "Failed")
    }</span>
  </div>
  ${data.paymentDetails.paymentMethod ? `
  <div class="booking-detail">
    <span class="label">${language === "he" ? "אמצעי תשלום:" : language === "ru" ? "Способ оплаты:" : "Payment Method:"}</span>
    <span class="value">${data.paymentDetails.paymentMethod}${data.paymentDetails.cardLast4 ? ` (****${data.paymentDetails.cardLast4})` : ''}</span>
  </div>
  ` : ''}
  ${data.paymentDetails.transactionId ? `
  <div class="booking-detail">
    <span class="label">${language === "he" ? "מזהה עסקה:" : language === "ru" ? "ID транзакции:" : "Transaction ID:"}</span>
    <span class="value" style="font-family: monospace; font-size: 12px;">${data.paymentDetails.transactionId}</span>
  </div>
  ` : ''}
</div>
` : ''}

<p>${language === "he" ? "בעת האישור הסופי תתקבל הודעת אסמס." : language === "ru" ? "При окончательном подтверждении вы получите SMS-уведомление." : "You will receive an SMS notification upon final confirmation."}</p>

<p style="text-align: center; margin: 20px 0;">
  <a href="${bookingDetailsLink}" class="button">${language === "he" ? "צפייה בהזמנה" : language === "ru" ? "Просмотр заказа" : "View Booking"}</a>
</p>

<p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Best regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
        text = treatmentBookingForOtherTextContent
        html = wrapHtml(treatmentBookingForOtherHtmlContent, subject)
      } else {
        // Check if this is a booker who booked for someone else
        if (data.isBookerForSomeoneElse && data.actualRecipientName) {
          // Email for the booker when they booked for someone else
          subject = language === "he" 
            ? `ההזמנה עבור ${data.actualRecipientName} בוצעה בהצלחה!`
            : language === "ru"
              ? `Заказ для ${data.actualRecipientName} успешно выполнен!`
              : `Booking for ${data.actualRecipientName} completed successfully!`

          const bookerForOtherTextContent = language === "he"
            ? `שלום ${recipientName},\n\nתואם טיפול עבור ${data.actualRecipientName} לפי המידע שהוזמן עבורו ונשלחה לו על כך הודעה בנייד ובמייל.\n\nניתן לצפות בהזמנה בקישור הבא:\n${bookingDetailsLink}${emailTextSignature}`
            : language === "ru"
              ? `Здравствуйте, ${recipientName},\n\nЗаказ для ${data.actualRecipientName} согласован в соответствии с заказанной информацией, и ему отправлено уведомление по SMS и электронной почте.\n\nВы можете просмотреть заказ по ссылке:\n${bookingDetailsLink}${emailTextSignature}`
              : `Hello ${recipientName},\n\nA treatment has been arranged for ${data.actualRecipientName} according to the information ordered for them and a notification has been sent to them via SMS and email.\n\nYou can view the booking at:\n${bookingDetailsLink}${emailTextSignature}`

          const bookerForOtherHtmlContent = `
<h2>${language === "he" ? "תואם טיפול!" : language === "ru" ? "Процедура согласована!" : "Treatment Arranged!"}</h2>
<p>${language === "he" ? `שלום ${recipientName},` : language === "ru" ? `Здравствуйте, ${recipientName},` : `Hello ${recipientName},`}</p>
<p>${language === "he" ? `תואם טיפול עבור ${data.actualRecipientName} לפי המידע שהוזמן עבורו ונשלחה לו על כך הודעה בנייד ובמייל.` : language === "ru" ? `Заказ для ${data.actualRecipientName} согласован в соответствии с заказанной информацией, и ему отправлено уведомление по SMS и электронной почте.` : `A treatment has been arranged for ${data.actualRecipientName} according to the information ordered for them and a notification has been sent to them via SMS and email.`}</p>

<p style="text-align: center; margin: 20px 0;">
  <a href="${bookingDetailsLink}" class="button">${language === "he" ? "צפייה בהזמנה" : language === "ru" ? "Просмотр заказа" : "View Booking"}</a>
</p>

<p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Best regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
          text = bookerForOtherTextContent
          html = wrapHtml(bookerForOtherHtmlContent, subject)
        } else {
          // Email for the booker (booking for themselves)
          subject = language === "he" 
            ? `ההזמנה שלך ב-${appName} בוצעה בהצלחה!`
            : language === "ru"
              ? `Ваш заказ в ${appName} успешно выполнен!`
              : `Your ${appName} booking has been completed successfully!`

          const treatmentBookingTextContent = language === "he"
            ? `שלום ${recipientName},\n\nההזמנה שלך בוצעה בהצלחה לתאריך ${formattedDate} בשעה ${formattedTime} ומחכה לשיוך מטפל/ת.\nבעת האישור הסופי תתקבל הודעת אסמס.\n\nתוכלו לצפות בהזמנה בקישור הבא:\n${bookingDetailsLink}${emailTextSignature}`
            : language === "ru"
              ? `Здравствуйте, ${recipientName},\n\nВаш заказ успешно выполнен на ${formattedDate} в ${formattedTime} и ожидает назначения специалиста.\nПри окончательном подтверждении вы получите SMS-уведомление.\n\nВы можете просмотреть заказ по ссылке:\n${bookingDetailsLink}${emailTextSignature}`
              : `Hello ${recipientName},\n\nYour booking has been successfully completed for ${formattedDate} at ${formattedTime} and is waiting for therapist assignment.\nYou will receive an SMS notification upon final confirmation.\n\nYou can view the booking at:\n${bookingDetailsLink}${emailTextSignature}`

          const treatmentBookingHtmlContent = `
<h2>${language === "he" ? "ההזמנה בוצעה בהצלחה!" : language === "ru" ? "Заказ успешно выполнен!" : "Booking Completed Successfully!"}</h2>
<p>${language === "he" ? `שלום ${recipientName},` : language === "ru" ? `Здравствуйте, ${recipientName},` : `Hello ${recipientName},`}</p>
<p>${language === "he" ? `ההזמנה שלך בוצעה בהצלחה לתאריך ${formattedDate} בשעה ${formattedTime} ומחכה לשיוך מטפל/ת.` : language === "ru" ? `Ваш заказ успешно выполнен на ${formattedDate} в ${formattedTime} и ожидает назначения специалиста.` : `Your booking has been successfully completed for ${formattedDate} at ${formattedTime} and is waiting for therapist assignment.`}</p>

<div class="booking-card">
  <h3>${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
    <span class="value">${treatmentName}</span>
  </div>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
    <span class="value">${formattedDate}</span>
  </div>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
    <span class="value">${formattedTime}</span>
  </div>
</div>

${data.priceDetails ? `
<div class="booking-card">
  <h3>${language === "he" ? "פרטי תשלום" : language === "ru" ? "Детали оплаты" : "Payment Details"}</h3>
  
  ${data.bookingSource ? `
  <div class="booking-detail">
    <span class="label">${language === "he" ? "מקור ההזמנה:" : language === "ru" ? "Источник заказа:" : "Booking Source:"}</span>
    <span class="value">${
      data.bookingSource === "subscription_redemption" 
        ? (language === "he" ? "מימוש מנוי" : language === "ru" ? "Использование подписки" : "Subscription Redemption")
        : data.bookingSource === "gift_voucher_redemption"
        ? (language === "he" ? "מימוש שובר מתנה" : language === "ru" ? "Использование подарочного ваучера" : "Gift Voucher Redemption") 
        : (language === "he" ? "רכישה חדשה" : language === "ru" ? "Новая покупка" : "New Purchase")
    }</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.redeemedSubscriptionName ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "מנוי בשימוש:" : language === "ru" ? "Используемая подписка:" : "Used Subscription:"}</span>
    <span class="value">${data.priceDetails.redeemedSubscriptionName}</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.appliedGiftVoucherCode ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "שובר מתנה:" : language === "ru" ? "Подарочный ваучер:" : "Gift Voucher:"}</span>
    <span class="value">${data.priceDetails.appliedGiftVoucherCode}</span>
  </div>
  ` : ''}
  
  <div class="booking-detail">
    <span class="label">${language === "he" ? "מחיר בסיס:" : language === "ru" ? "Базовая цена:" : "Base Price:"}</span>
    <span class="value">₪${data.priceDetails.basePrice.toFixed(2)}</span>
  </div>
  
  ${data.priceDetails.surcharges && data.priceDetails.surcharges.length > 0 ? `
  ${data.priceDetails.surcharges.map(surcharge => `
  <div class="booking-detail" style="color: #f59e0b;">
    <span class="label">${surcharge.description === "workingHours.eveningHours" ? (language === "he" ? "תוספת שעות ערב:" : "Evening Hours:") : surcharge.description + ":"}</span>
    <span class="value">+₪${surcharge.amount.toFixed(2)}</span>
  </div>
  `).join('')}
  <div class="booking-detail" style="color: #f59e0b; border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 8px;">
    <span class="label">${language === "he" ? "סה״כ תוספות:" : language === "ru" ? "Всего доплат:" : "Total Surcharges:"}</span>
    <span class="value">+₪${data.priceDetails.totalSurchargesAmount.toFixed(2)}</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.voucherAppliedAmount > 0 ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "שובר מתנה:" : language === "ru" ? "Подарочный ваучер:" : "Gift Voucher:"}</span>
    <span class="value">-₪${data.priceDetails.voucherAppliedAmount.toFixed(2)}</span>
  </div>
  ` : ''}
  
  ${data.priceDetails.couponDiscount > 0 ? `
  <div class="booking-detail" style="color: #10b981;">
    <span class="label">${language === "he" ? "הנחת קופון:" : language === "ru" ? "Скидка по купону:" : "Coupon Discount:"}</span>
    <span class="value">-₪${data.priceDetails.couponDiscount.toFixed(2)}</span>
  </div>
  ` : ''}
  
  <div class="booking-detail" style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px; font-weight: bold; font-size: 18px;">
    <span class="label">${language === "he" ? "סכום לתשלום:" : language === "ru" ? "К оплате:" : "Total Amount:"}</span>
    <span class="value" style="color: #3b82f6;">
      ${data.priceDetails.isFullyCoveredByVoucherOrSubscription 
        ? (language === "he" ? "ללא תשלום" : language === "ru" ? "Бесплатно" : "Free") 
        : "₪" + data.priceDetails.finalAmount.toFixed(2)}
    </span>
  </div>
</div>
` : ''}

${data.paymentDetails ? `
<div class="booking-card">
  <h3>${language === "he" ? "אמצעי תשלום" : language === "ru" ? "Способ оплаты" : "Payment Method"}</h3>
  <div class="booking-detail">
    <span class="label">${language === "he" ? "סטטוס תשלום:" : language === "ru" ? "Статус оплаты:" : "Payment Status:"}</span>
    <span class="value">${
      data.paymentDetails.paymentStatus === 'paid' 
        ? (language === "he" ? "שולם" : language === "ru" ? "Оплачено" : "Paid")
        : data.paymentDetails.paymentStatus === 'pending' 
        ? (language === "he" ? "ממתין לתשלום" : language === "ru" ? "Ожидает оплаты" : "Pending")
        : data.paymentDetails.paymentStatus === 'not_required'
        ? (language === "he" ? "לא נדרש תשלום" : language === "ru" ? "Оплата не требуется" : "No Payment Required")
        : (language === "he" ? "נכשל" : language === "ru" ? "Неуспешно" : "Failed")
    }</span>
  </div>
  ${data.paymentDetails.paymentMethod ? `
  <div class="booking-detail">
    <span class="label">${language === "he" ? "אמצעי תשלום:" : language === "ru" ? "Способ оплаты:" : "Payment Method:"}</span>
    <span class="value">${data.paymentDetails.paymentMethod}${data.paymentDetails.cardLast4 ? ` (****${data.paymentDetails.cardLast4})` : ''}</span>
  </div>
  ` : ''}
  ${data.paymentDetails.transactionId ? `
  <div class="booking-detail">
    <span class="label">${language === "he" ? "מזהה עסקה:" : language === "ru" ? "ID транзакции:" : "Transaction ID:"}</span>
    <span class="value" style="font-family: monospace; font-size: 12px;">${data.paymentDetails.transactionId}</span>
  </div>
  ` : ''}
</div>
` : ''}

<p>${language === "he" ? "בעת האישור הסופי תתקבל הודעת אסמס." : language === "ru" ? "При окончательном подтверждении вы получите SMS-уведомление." : "You will receive an SMS notification upon final confirmation."}</p>

<p style="text-align: center; margin: 20px 0;">
  <a href="${bookingDetailsLink}" class="button">${language === "he" ? "צפייה בהזמנה" : language === "ru" ? "Просмотр заказа" : "View Booking"}</a>
</p>

<p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Best regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
          text = treatmentBookingTextContent
          html = wrapHtml(treatmentBookingHtmlContent, subject)
        }
      }
      break

    case "otp":
      subject =
        language === "he"
          ? `קוד האימות שלך ל-${appName}`
          : language === "ru"
            ? `Ваш код подтверждения для ${appName}`
            : `Your verification code for ${appName}`
      const otpTextContent =
        language === "he"
          ? `שלום,\n\nקוד האימות שלך הוא: ${data.code}\nהקוד תקף ל-${data.expiresIn || 10} דקות.${emailTextSignature}`
          : language === "ru"
            ? `Здравствуйте,\n\nВаш код подтверждения: ${data.code}\nКод действителен в течение ${data.expiresIn || 10} минут.${emailTextSignature}`
            : `Hello,\n\nYour verification code is: ${data.code}\nThis code is valid for ${data.expiresIn || 10} minutes.${emailTextSignature}`
      const otpHtmlContent = `
<h2>${language === "he" ? "קוד האימות שלך" : language === "ru" ? "Ваш код подтверждения" : "Your Verification Code"}</h2>
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
          ? `שלום ${data.userName || userName},\n\nברוך הבא ל-${appName}!${emailTextSignature}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName || userName},\n\nДобро пожаловать в ${appName}!${emailTextSignature}`
            : `Hello ${data.userName || userName},\n\nWelcome to ${appName}!${emailTextSignature}`
      const welcomeHtmlContent = `
<h2>${language === "he" ? `ברוך הבא ל-${appName}!` : language === "ru" ? `Добро пожаловать в ${appName}!` : `Welcome to ${appName}!`}</h2>
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
          ? `שלום ${data.userName || userName},\n\nאנא לחץ על הקישור הבא לאיפוס סיסמתך: ${data.resetLink}\n\nאם לא ביקשת זאת, אנא התעלם ממייל זה.${emailTextSignature}`
          : language === "ru"
            ? `Здравствуйте, ${data.userName || userName},\n\nПожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль: ${data.resetLink}\n\nЕсли вы не запрашивали это, пожалуйста, проигнорируйте это письмо.${emailTextSignature}`
            : `Hello ${data.userName || userName},\n\nPlease click the following link to reset your password: ${data.resetLink}\n\nIf you did not request this, please ignore this email.${emailTextSignature}`
      const passwordResetHtmlContent = `
<h2>${language === "he" ? "איפוס סיסמה" : language === "ru" ? "Сброс пароля" : "Password Reset"}</h2>
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
<h2>You're Invited!</h2>
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
<h2>${language === "he" ? "איפוס סיסמה למנהל" : language === "ru" ? "Сброс пароля администратора" : "Admin Password Reset"}</h2>
<p>${language === "he" ? `שלום ${data.userName || userName},` : language === "ru" ? `Здравствуйте, ${data.userName || userName},` : `Hello ${data.userName || userName},`}</p>
<p>${language === "he" ? "מנהל המערכת ביקש לאפס את סיסמתך." : language === "ru" ? "Администратор системы запросил сброс вашего пароля." : "A system administrator has requested to reset your password."}</p>
<p>${language === "he" ? "אנא לחץ על הקישור הבא לאיפוס סיסמתך:" : language === "ru" ? "Пожалуйста, нажмите на следующую ссылку, чтобы сбросить пароль:" : "Please click the link below to reset your password:"}</p>
<p style="text-align: center; margin: 20px 0;"><a href="${data.resetLink}" class="button">${language === "he" ? "אפס סיסמה" : language === "ru" ? "Сбросить пароль" : "Reset Password"}</a></p>
<p>${language === "he" ? "תודה," : language === "ru" ? "Спасибо," : "Thanks,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
`
      text = adminPasswordResetTextContent
      html = wrapHtml(adminPasswordResetHtmlContent, subject)
      break

    case "purchase-success":
      subject = language === "he" ? "תודה על רכישתך" : "Purchase Confirmation"
      text = data.message || ""
      html = wrapHtml(`<p>${data.message || ""}</p>`, subject)
      break

    case "review-reminder":
      subject = language === "he" ? "נשמח לחוות דעתך" : language === "ru" ? "Мы будем рады вашему отзыву" : "We'd love your feedback"
      const reviewTextContent =
        (language === "he"
          ? `שלום ${data.recipientName},\nנשמח אם תדרגו את הטיפול שקיבלתם בקישור הבא:\n${data.reviewLink}`
          : language === "ru"
            ? `Здравствуйте, ${data.recipientName}! Будем признательны за ваш отзыв о полученной услуге:\n${data.reviewLink}`
            : `Hi ${data.recipientName}, we'd love your feedback about your treatment:\n${data.reviewLink}`) + emailTextSignature
      const reviewHtmlContent = `
        <p>${language === "he" ? `שלום ${data.recipientName},` : language === "ru" ? `Здравствуйте, ${data.recipientName}!` : `Hello ${data.recipientName},`}</p>
        <p>${language === "he" ? "נשמח אם תדרג/י את הטיפול שקיבלת." : language === "ru" ? "Мы будем признательны за ваш отзыв о полученной услуге." : "We'd appreciate your feedback about the treatment you received."}</p>
        <p style="text-align: center; margin: 20px 0;"><a href="${data.reviewLink}" class="button">${language === "he" ? "כתיבת חוות דעת" : language === "ru" ? "Оставить отзыв" : "Leave a Review"}</a></p>
      `
      text = reviewTextContent
      html = wrapHtml(reviewHtmlContent, subject)
      break

    case "professional-booking-notification": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      const responseLink = data.responseLink || "https://masu.co.il"
      
      // ✅ FIX: Correct way to detect admin assignment vs availability notification
      // Admin assignment is when responseMethod is explicitly set to "admin_assignment"
      const isAdminAssigned = data.responseMethod === "admin_assignment"
      
      if (isAdminAssigned) {
        subject = language === "he" ? "ההזמנה שוייכה אליך!" : language === "ru" ? "Заказ назначен вам!" : "Booking assigned to you!"
        const textContent =
          (language === "he"
            ? `שלום,\n\n🎯 מנהל המערכת שייך אליך הזמנה לטיפול ${data.treatmentName}!\n\nפרטי ההזמנה:\n📅 תאריך: ${formattedDate}\n🕐 שעה: ${formattedTime}\n📍 כתובת: ${data.address || data.bookingAddress}\n\nההזמנה מאושרת ומוכנה לטיפול.\nניתן לעדכן סטטוס ול\"בדרך\" דרך הקישור: ${responseLink}`
            : language === "ru"
              ? `Здравствуйте,\n\n🎯 Администратор назначил вам заказ на процедуру ${data.treatmentName}!\n\nДетали заказа:\n📅 Дата: ${formattedDate}\n🕐 Время: ${formattedTime}\n📍 Адрес: ${data.address || data.bookingAddress}\n\nЗаказ подтвержден и готов к выполнению.\nВы можете обновить статус через ссылку: ${responseLink}`
              : `Hello,\n\n🎯 The system administrator has assigned you a booking for ${data.treatmentName}!\n\nBooking details:\n📅 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n📍 Address: ${data.address || data.bookingAddress}\n\nThe booking is confirmed and ready for treatment.\nYou can update the status via: ${responseLink}`) +
          emailTextSignature
        const htmlContent = `
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 24px;">🎯 ${language === "he" ? "ההזמנה שוייכה אליך!" : language === "ru" ? "Заказ назначен вам!" : "Booking assigned to you!"}</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${language === "he" ? "מנהל המערכת שייך אליך הזמנה חדשה" : language === "ru" ? "Администратор назначил вам новый заказ" : "The administrator has assigned you a new booking"}</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</strong> ${data.treatmentName}</p>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</strong> ${formattedTime}</p>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "כתובת:" : language === "ru" ? "Адрес:" : "Address:"}</strong> ${data.address || data.bookingAddress}</p>
          </div>
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #0277bd;"><strong>💡 ${language === "he" ? "ההזמנה כבר מאושרת ומוכנה לטיפול" : language === "ru" ? "Заказ уже подтвержден и готов к выполнению" : "The booking is already confirmed and ready for treatment"}</strong></p>
          </div>
          <p style="text-align:center;margin:20px 0;"><a href="${responseLink}" class="button">${language === "he" ? "כניסה לעמוד הטיפול" : language === "ru" ? "Войти на страницу лечения" : "Go to Treatment Page"}</a></p>
        `
        text = textContent
        html = wrapHtml(htmlContent, subject)
      } else {
        subject = language === "he" ? "הזמנה חדשה זמינה לשיוך!" : language === "ru" ? "Доступен новый заказ!" : "New booking available!"
        const textContent =
          (language === "he"
            ? `שלום,\n\n🔔 הזמנה חדשה לטיפול ${data.treatmentName} זמינה לשיוך!\n\nפרטי ההזמנה:\n📅 תאריך: ${formattedDate}\n🕐 שעה: ${formattedTime}\n📍 עיר: ${data.address ? data.address.split(',').pop().trim() : ""}\n\n💡 ההזמנה זמינה לשיוך - כל עוד לא נתפסה על ידי מטפל אחר\n\nלצפייה ואישור: ${responseLink}`
            : language === "ru"
              ? `Здравствуйте,\n\n🔔 Доступен новый заказ на процедуру ${data.treatmentName}!\n\nДетали заказа:\n📅 Дата: ${formattedDate}\n🕐 Время: ${formattedTime}\n📍 Город: ${data.address ? data.address.split(',').pop().trim() : ""}\n\n💡 Заказ доступен для назначения - пока не занят другим специалистом\n\nПросмотр и подтверждение: ${responseLink}`
              : `Hello,\n\n🔔 A new booking for ${data.treatmentName} is available!\n\nBooking details:\n📅 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n📍 City: ${data.address ? data.address.split(',').pop().trim() : ""}\n\n💡 Booking available for assignment - until taken by another professional\n\nView and confirm: ${responseLink}`) +
          emailTextSignature
        const htmlContent = `
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 24px;">🔔 ${language === "he" ? "הזמנה חדשה זמינה לשיוך!" : language === "ru" ? "Доступен новый заказ!" : "New booking available!"}</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${language === "he" ? "הזמנה חדשה ממתינה לשיוך מטפל" : language === "ru" ? "Новый заказ ожидает назначения специалиста" : "New booking waiting for professional assignment"}</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</strong> ${data.treatmentName}</p>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</strong> ${formattedTime}</p>
            <p style="margin: 5px 0;"><strong>${language === "he" ? "עיר:" : language === "ru" ? "Город:" : "City:"}</strong> ${data.address ? data.address.split(',').pop().trim() : ""}</p>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #d97706;"><strong>💡 ${language === "he" ? "ההזמנה זמינה לשיוך - כל עוד לא נתפסה על ידי מטפל אחר" : language === "ru" ? "Заказ доступен для назначения - пока не занят другим специалистом" : "Booking available for assignment - until taken by another professional"}</strong></p>
          </div>
          <p style="text-align:center;margin:20px 0;"><a href="${responseLink}" class="button">${language === "he" ? "לצפייה ואישור" : language === "ru" ? "Просмотр и подтверждение" : "View & Confirm"}</a></p>
        `
        text = textContent
        html = wrapHtml(htmlContent, subject)
      }
      break
    }

    case "BOOKING_ASSIGNED_PROFESSIONAL": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { 
          weekday: "long",
          day: "2-digit", 
          month: "long", 
          year: "numeric", 
          timeZone: "Asia/Jerusalem" 
        }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      const managementLink = data.bookingDetailsLink || "https://masu.co.il"
      
      subject = language === "he" ? "נשמח אם תוכל לקחת הזמנה זו!" : language === "ru" ? "Мы будем рады, если вы сможете принять этот заказ!" : "We'd love for you to take this booking!"
      
      const textContent =
        (language === "he"
          ? `שלום ${data.professionalName},\n\nשוייכת אליך הזמנה חדשה לטיפול ${data.treatmentName} לתאריך ${formattedDate} בשעה ${formattedTime}.\n\nפרטי הלקוח: ${data.clientName}${data.address ? `\nכתובת: ${data.address}` : ""}\n\nניתן לצפות בפרטי ההזמנה ולנהל אותה דרך הקישור הבא:\n${managementLink}`
          : language === "ru"
            ? `Здравствуйте, ${data.professionalName},\n\nВам назначен новый заказ на процедуру ${data.treatmentName} на ${formattedDate} в ${formattedTime}.\n\nДанные клиента: ${data.clientName}${data.address ? `\nАдрес: ${data.address}` : ""}\n\nВы можете просмотреть детали заказа и управлять им по ссылке:\n${managementLink}`
            : `Hello ${data.professionalName},\n\nA new booking for ${data.treatmentName} on ${formattedDate} at ${formattedTime} has been assigned to you.\n\nClient details: ${data.clientName}${data.address ? `\nAddress: ${data.address}` : ""}\n\nYou can view the booking details and manage it at:\n${managementLink}`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "הזמנה חדשה שוייכה אליך!" : language === "ru" ? "Вам назначен новый заказ!" : "New booking assigned to you!"}</h2>
        <p>${language === "he" ? `שלום ${data.professionalName},` : language === "ru" ? `Здравствуйте, ${data.professionalName},` : `Hello ${data.professionalName},`}</p>
        <p>${language === "he" ? `שוייכת אליך הזמנה חדשה לטיפול ${data.treatmentName}.` : language === "ru" ? `Вам назначен новый заказ на процедуру ${data.treatmentName}.` : `A new booking for ${data.treatmentName} has been assigned to you.`}</p>

        <div class="booking-card">
          <h3>${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
            <span class="value">${formattedTime}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "לקוח:" : language === "ru" ? "Клиент:" : "Client:"}</span>
            <span class="value">${data.clientName}</span>
          </div>
          ${data.address ? `<div class="booking-detail">
            <span class="label">${language === "he" ? "כתובת:" : language === "ru" ? "Адрес:" : "Address:"}</span>
            <span class="value">${data.address}</span>
          </div>` : ''}
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${managementLink}" class="button">${language === "he" ? "לצפייה וניהול ההזמנה" : language === "ru" ? "Посмотреть и управлять заказом" : "View & Manage Booking"}</a>
        </p>
        
        <p>${language === "he" ? "ההזמנה שוייכה אליך על ידי מנהל המערכת. אנא צפה בפרטים ונהל את ההזמנה לפי הצורך." : language === "ru" ? "Заказ назначен вам администратором системы. Пожалуйста, просмотрите детали и управляйте заказом по необходимости." : "This booking was assigned to you by the system administrator. Please review the details and manage the booking as needed."}</p>
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

    case "professional-on-way": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      
      subject = language === "he" ? "המטפל שלך בדרך!" : language === "ru" ? "Ваш специалист в пути!" : "Your therapist is on the way!"
      
      const textContent =
        (language === "he"
          ? `שלום,\n\nהמטפל ${data.professionalName} בדרך לטיפול ${data.treatmentName} שנקבע ל-${formattedDate} בשעה ${formattedTime}.\n\nמספר הזמנה: ${data.bookingNumber}\n\nהמטפל יגיע בקרוב!`
          : language === "ru"
            ? `Здравствуйте,\n\nСпециалист ${data.professionalName} в пути к процедуре ${data.treatmentName}, запланированной на ${formattedDate} в ${formattedTime}.\n\nНомер заказа: ${data.bookingNumber}\n\nСпециалист скоро прибудет!`
            : `Hello,\n\nYour therapist ${data.professionalName} is on the way to your ${data.treatmentName} treatment scheduled for ${formattedDate} at ${formattedTime}.\n\nBooking number: ${data.bookingNumber}\n\nThe therapist will arrive soon!`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "המטפל שלך בדרך!" : language === "ru" ? "Ваш специалист в пути!" : "Your therapist is on the way!"}</h2>
        <p>${language === "he" ? "שלום," : language === "ru" ? "Здравствуйте," : "Hello,"}</p>
        <p>${language === "he" ? `המטפל ${data.professionalName} בדרך לטיפול ${data.treatmentName} שנקבע ל-${formattedDate} בשעה ${formattedTime}.` : language === "ru" ? `Специалист ${data.professionalName} в пути к процедуре ${data.treatmentName}, запланированной на ${formattedDate} в ${formattedTime}.` : `Your therapist ${data.professionalName} is on the way to your ${data.treatmentName} treatment scheduled for ${formattedDate} at ${formattedTime}.`}</p>
        <p><strong>${language === "he" ? "מספר הזמנה:" : language === "ru" ? "Номер заказа:" : "Booking number:"}</strong> ${data.bookingNumber}</p>
        <p>${language === "he" ? "המטפל יגיע בקרוב!" : language === "ru" ? "Специалист скоро прибудет!" : "The therapist will arrive soon!"}</p>
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

    case "review_request":
      subject = language === "he" ? "איך היה הטיפול? נשמח לחוות דעתך" : language === "ru" ? "Как прошла процедура? Мы будем рады услышать ваш отзыв" : "How was your treatment? We'd love your feedback"
      const reviewRequestTextContent =
        (language === "he"
          ? `שלום ${data.customerName},\n\nתודה שבחרת ב-${appName}!\n\nנשמח אם תשתף אותנו בחוות דעתך על הטיפול ${data.treatmentName} שקיבלת מ-${data.professionalName}.\n\nלמילוי חוות הדעת: ${data.reviewUrl}\n\nמספר הזמנה: ${data.bookingNumber}\n\nחוות הדעת שלך חשובה לנו ומסייעת לנו לשפר את השירות.`
          : language === "ru"
            ? `Здравствуйте, ${data.customerName},\n\nСпасибо, что выбрали ${appName}!\n\nМы будем рады услышать ваш отзыв о процедуре ${data.treatmentName}, которую вы получили от ${data.professionalName}.\n\nОставить отзыв: ${data.reviewUrl}\n\nНомер заказа: ${data.bookingNumber}\n\nВаш отзыв важен для нас и помогает улучшить наш сервис.`
            : `Hello ${data.customerName},\n\nThank you for choosing ${appName}!\n\nWe'd love to hear your feedback about the ${data.treatmentName} treatment you received from ${data.professionalName}.\n\nLeave a review: ${data.reviewUrl}\n\nBooking number: ${data.bookingNumber}\n\nYour feedback is important to us and helps us improve our service.`) +
        emailTextSignature
      const reviewRequestHtmlContent = `
        <h2>${language === "he" ? "איך היה הטיפול?" : language === "ru" ? "Как прошла процедура?" : "How was your treatment?"}</h2>
        <p>${language === "he" ? `שלום ${data.customerName},` : language === "ru" ? `Здравствуйте, ${data.customerName},` : `Hello ${data.customerName},`}</p>
        <p>${language === "he" ? `תודה שבחרת ב-${appName}!` : language === "ru" ? `Спасибо, что выбрали ${appName}!` : `Thank you for choosing ${appName}!`}</p>
        <p>${language === "he" ? `נשמח אם תשתף אותנו בחוות דעתך על הטיפול ${data.treatmentName} שקיבלת מ-${data.professionalName}.` : language === "ru" ? `Мы будем рады услышать ваш отзыв о процедуре ${data.treatmentName}, которую вы получили от ${data.professionalName}.` : `We'd love to hear your feedback about the ${data.treatmentName} treatment you received from ${data.professionalName}.`}</p>
        
        <div class="booking-card">
          <h3>${language === "he" ? "פרטי הטיפול" : language === "ru" ? "Детали процедуры" : "Treatment Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מטפל:" : language === "ru" ? "Специалист:" : "Therapist:"}</span>
            <span class="value">${data.professionalName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מספר הזמנה:" : language === "ru" ? "Номер заказа:" : "Booking number:"}</span>
            <span class="value">${data.bookingNumber}</span>
          </div>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${data.reviewUrl}" class="button">${language === "he" ? "כתיבת חוות דעת" : language === "ru" ? "Оставить отзыв" : "Leave a Review"}</a>
        </p>
        
        <p style="text-align: center; color: #666; font-size: 14px;">${language === "he" ? "חוות הדעת שלך חשובה לנו ומסייעת לנו לשפר את השירות" : language === "ru" ? "Ваш отзыв важен для нас и помогает улучшить наш сервис" : "Your feedback is important to us and helps us improve our service"}</p>
        
        <p>${language === "he" ? "בברכה," : language === "ru" ? "С уважением," : "Best regards,"}<br/>${language === "he" ? `צוות ${emailFrom}` : language === "ru" ? `Команда ${emailFrom}` : `The ${emailFrom} Team`}</p>
      `
      text = reviewRequestTextContent
      html = wrapHtml(reviewRequestHtmlContent, subject)
      break

    case "booking_confirmed": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      
      subject = language === "he" ? "ההזמנה שלך אושרה!" : language === "ru" ? "Ваш заказ подтвержден!" : "Your booking is confirmed!"
      
      const textContent =
        (language === "he"
          ? `שלום ${data.customerName},\n\nההזמנה שלך אושרה!\n\nפרטי ההזמנה:\nטיפול: ${data.treatmentName}\nתאריך: ${formattedDate}\nשעה: ${formattedTime}\nמספר הזמנה: ${data.bookingNumber}\n\n${data.professionalName ? `המטפל שלך: ${data.professionalName}` : 'המטפל ייקבע בקרוב'}`
          : language === "ru"
            ? `Здравствуйте, ${data.customerName},\n\nВаш заказ подтвержден!\n\nДетали заказа:\nПроцедура: ${data.treatmentName}\nДата: ${formattedDate}\nВремя: ${formattedTime}\nНомер заказа: ${data.bookingNumber}\n\n${data.professionalName ? `Ваш специалист: ${data.professionalName}` : 'Специалист будет назначен в ближайшее время'}`
            : `Hello ${data.customerName},\n\nYour booking is confirmed!\n\nBooking Details:\nTreatment: ${data.treatmentName}\nDate: ${formattedDate}\nTime: ${formattedTime}\nBooking Number: ${data.bookingNumber}\n\n${data.professionalName ? `Your therapist: ${data.professionalName}` : 'Your therapist will be assigned soon'}`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "ההזמנה שלך אושרה!" : language === "ru" ? "Ваш заказ подтвержден!" : "Your booking is confirmed!"}</h2>
        <p>${language === "he" ? `שלום ${data.customerName},` : language === "ru" ? `Здравствуйте, ${data.customerName},` : `Hello ${data.customerName},`}</p>
        <p>${language === "he" ? "ההזמנה שלך אושרה בהצלחה!" : language === "ru" ? "Ваш заказ успешно подтвержден!" : "Your booking has been successfully confirmed!"}</p>
        
        <div class="booking-card">
          <h3>${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
            <span class="value">${formattedTime}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מספר הזמנה:" : language === "ru" ? "Номер заказа:" : "Booking Number:"}</span>
            <span class="value">${data.bookingNumber}</span>
          </div>
          ${data.professionalName ? `
          <div class="booking-detail">
            <span class="label">${language === "he" ? "המטפל שלך:" : language === "ru" ? "Ваш специалист:" : "Your therapist:"}</span>
            <span class="value">${data.professionalName}</span>
          </div>
          ` : `
          <div class="booking-detail">
            <span class="label">${language === "he" ? "סטטוס:" : language === "ru" ? "Статус:" : "Status:"}</span>
            <span class="value">${language === "he" ? "המטפל ייקבע בקרוב" : language === "ru" ? "Специалист будет назначен в ближайшее время" : "Therapist will be assigned soon"}</span>
          </div>
          `}
        </div>
        
        ${data.bookingDetailsLink ? `
        <p style="text-align: center; margin: 20px 0;">
          <a href="${data.bookingDetailsLink}" class="button">${language === "he" ? "צפייה בהזמנה" : language === "ru" ? "Просмотр заказа" : "View Booking"}</a>
        </p>
        ` : ''}
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

    case "booking_cancelled": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      
      subject = language === "he" ? "ההזמנה שלך בוטלה" : language === "ru" ? "Ваш заказ отменен" : "Your booking has been cancelled"
      
      const textContent =
        (language === "he"
          ? `שלום ${data.customerName},\n\nההזמנה שלך בוטלה.\n\nפרטי ההזמנה שבוטלה:\nטיפול: ${data.treatmentName}\nתאריך: ${formattedDate}\nשעה: ${formattedTime}\nמספר הזמנה: ${data.bookingNumber}\n\n${data.reason ? `סיבת הביטול: ${data.reason}` : ''}\n\nנשמח לעזור לך להזמין מועד חדש.`
          : language === "ru"
            ? `Здравствуйте, ${data.customerName},\n\nВаш заказ был отменен.\n\nДетали отмененного заказа:\nПроцедура: ${data.treatmentName}\nДата: ${formattedDate}\nВремя: ${formattedTime}\nНомер заказа: ${data.bookingNumber}\n\n${data.reason ? `Причина отмены: ${data.reason}` : ''}\n\nМы будем рады помочь вам забронировать новое время.`
            : `Hello ${data.customerName},\n\nYour booking has been cancelled.\n\nCancelled Booking Details:\nTreatment: ${data.treatmentName}\nDate: ${formattedDate}\nTime: ${formattedTime}\nBooking Number: ${data.bookingNumber}\n\n${data.reason ? `Cancellation reason: ${data.reason}` : ''}\n\nWe'd be happy to help you book a new appointment.`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "ההזמנה שלך בוטלה" : language === "ru" ? "Ваш заказ отменен" : "Your booking has been cancelled"}</h2>
        <p>${language === "he" ? `שלום ${data.customerName},` : language === "ru" ? `Здравствуйте, ${data.customerName},` : `Hello ${data.customerName},`}</p>
        <p>${language === "he" ? "מצטערים להודיע שההזמנה שלך בוטלה." : language === "ru" ? "Сожалеем сообщить, что ваш заказ был отменен." : "We regret to inform you that your booking has been cancelled."}</p>
        
        <div class="booking-card">
          <h3>${language === "he" ? "פרטי ההזמנה שבוטלה" : language === "ru" ? "Детали отмененного заказа" : "Cancelled Booking Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
            <span class="value">${formattedTime}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מספר הזמנה:" : language === "ru" ? "Номер заказа:" : "Booking Number:"}</span>
            <span class="value">${data.bookingNumber}</span>
          </div>
          ${data.reason ? `
          <div class="booking-detail">
            <span class="label">${language === "he" ? "סיבת הביטול:" : language === "ru" ? "Причина отмены:" : "Cancellation reason:"}</span>
            <span class="value">${data.reason}</span>
          </div>
          ` : ''}
        </div>
        
        <p>${language === "he" ? "נשמח לעזור לך להזמין מועד חדש. ניתן ליצור קשר איתנו או להזמין דרך האפליקציה." : language === "ru" ? "Мы будем рады помочь вам забронировать новое время. Вы можете связаться с нами или забронировать через приложение." : "We'd be happy to help you book a new appointment. You can contact us or book through the app."}</p>
        
        <p style="text-align: center; margin: 20px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://masu.co.il'}" class="button">${language === "he" ? "הזמן טיפול חדש" : language === "ru" ? "Забронировать новую процедуру" : "Book New Treatment"}</a>
        </p>
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

    case "booking_updated": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      
      subject = language === "he" ? "ההזמנה שלך עודכנה" : language === "ru" ? "Ваш заказ обновлен" : "Your booking has been updated"
      
      const textContent =
        (language === "he"
          ? `שלום ${data.customerName},\n\nההזמנה שלך עודכנה.\n\nפרטי ההזמנה המעודכנת:\nטיפול: ${data.treatmentName}\nתאריך: ${formattedDate}\nשעה: ${formattedTime}\nמספר הזמנה: ${data.bookingNumber}\n\n${data.changes ? `שינויים: ${data.changes}` : ''}`
          : language === "ru"
            ? `Здравствуйте, ${data.customerName},\n\nВаш заказ был обновлен.\n\nОбновленные детали заказа:\nПроцедура: ${data.treatmentName}\nДата: ${formattedDate}\nВремя: ${formattedTime}\nНомер заказа: ${data.bookingNumber}\n\n${data.changes ? `Изменения: ${data.changes}` : ''}`
            : `Hello ${data.customerName},\n\nYour booking has been updated.\n\nUpdated Booking Details:\nTreatment: ${data.treatmentName}\nDate: ${formattedDate}\nTime: ${formattedTime}\nBooking Number: ${data.bookingNumber}\n\n${data.changes ? `Changes: ${data.changes}` : ''}`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "ההזמנה שלך עודכנה" : language === "ru" ? "Ваш заказ обновлен" : "Your booking has been updated"}</h2>
        <p>${language === "he" ? `שלום ${data.customerName},` : language === "ru" ? `Здравствуйте, ${data.customerName},` : `Hello ${data.customerName},`}</p>
        <p>${language === "he" ? "ההזמנה שלך עודכנה בהצלחה." : language === "ru" ? "Ваш заказ был успешно обновлен." : "Your booking has been successfully updated."}</p>
        
        <div class="booking-card">
          <h3>${language === "he" ? "פרטי ההזמנה המעודכנת" : language === "ru" ? "Обновленные детали заказа" : "Updated Booking Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
            <span class="value">${formattedTime}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מספר הזמנה:" : language === "ru" ? "Номер заказа:" : "Booking Number:"}</span>
            <span class="value">${data.bookingNumber}</span>
          </div>
          ${data.changes ? `
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שינויים:" : language === "ru" ? "Изменения:" : "Changes:"}</span>
            <span class="value">${data.changes}</span>
          </div>
          ` : ''}
        </div>
        
        ${data.bookingDetailsLink ? `
        <p style="text-align: center; margin: 20px 0;">
          <a href="${data.bookingDetailsLink}" class="button">${language === "he" ? "צפייה בהזמנה" : language === "ru" ? "Просмотр заказа" : "View Booking"}</a>
        </p>
        ` : ''}
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

    case "professional_assigned": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      
      subject = language === "he" ? "שויך מטפל להזמנה שלך!" : language === "ru" ? "К вашему заказу назначен специалист!" : "A therapist has been assigned to your booking!"
      
      const textContent =
        (language === "he"
          ? `שלום ${data.customerName},\n\nמטפל שויך להזמנה שלך!\n\nפרטי ההזמנה:\nטיפול: ${data.treatmentName}\nתאריך: ${formattedDate}\nשעה: ${formattedTime}\nמספר הזמנה: ${data.bookingNumber}\nהמטפל שלך: ${data.professionalName}\n\nהמטפל יצור איתך קשר בקרוב לתיאום פרטים נוספים.`
          : language === "ru"
            ? `Здравствуйте, ${data.customerName},\n\nК вашему заказу назначен специалист!\n\nДетали заказа:\nПроцедура: ${data.treatmentName}\nДата: ${formattedDate}\nВремя: ${formattedTime}\nНомер заказа: ${data.bookingNumber}\nВаш специалист: ${data.professionalName}\n\nСпециалист свяжется с вами в ближайшее время для согласования дополнительных деталей.`
            : `Hello ${data.customerName},\n\nA therapist has been assigned to your booking!\n\nBooking Details:\nTreatment: ${data.treatmentName}\nDate: ${formattedDate}\nTime: ${formattedTime}\nBooking Number: ${data.bookingNumber}\nYour therapist: ${data.professionalName}\n\nYour therapist will contact you soon to coordinate additional details.`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "שויך מטפל להזמנה שלך!" : language === "ru" ? "К вашему заказу назначен специалист!" : "A therapist has been assigned to your booking!"}</h2>
        <p>${language === "he" ? `שלום ${data.customerName},` : language === "ru" ? `Здравствуйте, ${data.customerName},` : `Hello ${data.customerName},`}</p>
        <p>${language === "he" ? "מצוין! מטפל מקצועי שויך להזמנה שלך." : language === "ru" ? "Отлично! К вашему заказу назначен профессиональный специалист." : "Great! A professional therapist has been assigned to your booking."}</p>
        
        <div class="booking-card">
          <h3>${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
            <span class="value">${formattedTime}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מספר הזמנה:" : language === "ru" ? "Номер заказа:" : "Booking Number:"}</span>
            <span class="value">${data.bookingNumber}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "המטפל שלך:" : language === "ru" ? "Ваш специалист:" : "Your therapist:"}</span>
            <span class="value">${data.professionalName}</span>
          </div>
        </div>
        
        <p>${language === "he" ? "המטפל יצור איתך קשר בקרוב לתיאום פרטים נוספים והכנה לטיפול." : language === "ru" ? "Специалист свяжется с вами в ближайшее время для согласования дополнительных деталей и подготовки к процедуре." : "Your therapist will contact you soon to coordinate additional details and prepare for the treatment."}</p>
        
        ${data.bookingDetailsLink ? `
        <p style="text-align: center; margin: 20px 0;">
          <a href="${data.bookingDetailsLink}" class="button">${language === "he" ? "צפייה בהזמנה" : language === "ru" ? "Просмотр заказа" : "View Booking"}</a>
        </p>
        ` : ''}
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

    case "professional_unassigned": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      
      subject = language === "he" ? "עדכון בנוגע להזמנה שלך" : language === "ru" ? "Обновление по вашему заказу" : "Update regarding your booking"
      
      const textContent =
        (language === "he"
          ? `שלום ${data.customerName},\n\nיש עדכון בנוגע להזמנה שלך.\n\nפרטי ההזמנה:\nטיפול: ${data.treatmentName}\nתאריך: ${formattedDate}\nשעה: ${formattedTime}\nמספר הזמנה: ${data.bookingNumber}\n\nמהסיבות שונות, המטפל ${data.professionalName} לא יוכל לבצע את הטיפול. אנחנו כבר עובדים על מציאת מטפל חלופי והודעה תישלח אליך בהקדם.`
          : language === "ru"
            ? `Здравствуйте, ${data.customerName},\n\nЕсть обновление по вашему заказу.\n\nДетали заказа:\nПроцедура: ${data.treatmentName}\nДата: ${formattedDate}\nВремя: ${formattedTime}\nНомер заказа: ${data.bookingNumber}\n\nПо различным причинам специалист ${data.professionalName} не сможет выполнить процедуру. Мы уже работаем над поиском альтернативного специалиста и уведомление будет отправлено вам в ближайшее время.`
            : `Hello ${data.customerName},\n\nThere's an update regarding your booking.\n\nBooking Details:\nTreatment: ${data.treatmentName}\nDate: ${formattedDate}\nTime: ${formattedTime}\nBooking Number: ${data.bookingNumber}\n\nDue to various reasons, therapist ${data.professionalName} will not be able to perform the treatment. We are already working on finding an alternative therapist and a notification will be sent to you shortly.`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "עדכון בנוגע להזמנה שלך" : language === "ru" ? "Обновление по вашему заказу" : "Update regarding your booking"}</h2>
        <p>${language === "he" ? `שלום ${data.customerName},` : language === "ru" ? `Здравствуйте, ${data.customerName},` : `Hello ${data.customerName},`}</p>
        <p>${language === "he" ? "יש עדכון חשוב בנוגע להזמנה שלך." : language === "ru" ? "Есть важное обновление по вашему заказу." : "There's an important update regarding your booking."}</p>
        
        <div class="booking-card">
          <h3>${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
            <span class="value">${formattedTime}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מספר הזמנה:" : language === "ru" ? "Номер заказа:" : "Booking Number:"}</span>
            <span class="value">${data.bookingNumber}</span>
          </div>
        </div>
        
        <p>${language === "he" ? `מהסיבות שונות, המטפל ${data.professionalName} לא יוכל לבצע את הטיפול. אנחנו כבר עובדים על מציאת מטפל חלופי מתאים והודעה תישלח אליך בהקדם.` : language === "ru" ? `По различным причинам специалист ${data.professionalName} не сможет выполнить процедуру. Мы уже работаем над поиском подходящего альтернативного специалиста и уведомление будет отправлено вам в ближайшее время.` : `Due to various reasons, therapist ${data.professionalName} will not be able to perform the treatment. We are already working on finding a suitable alternative therapist and a notification will be sent to you shortly.`}</p>
        
        <p>${language === "he" ? "מצטערים על אי הנוחות ותודה על הסבלנות." : language === "ru" ? "Извините за неудобства и спасибо за терпение." : "We apologize for the inconvenience and thank you for your patience."}</p>
        
        ${data.bookingDetailsLink ? `
        <p style="text-align: center; margin: 20px 0;">
          <a href="${data.bookingDetailsLink}" class="button">${language === "he" ? "צפייה בהזמנה" : language === "ru" ? "Просмотр заказа" : "View Booking"}</a>
        </p>
        ` : ''}
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

    case "new_booking_available": {
      const bookingDateTime = data.bookingDateTime ? new Date(data.bookingDateTime) : new Date()
      const formattedDate = bookingDateTime.toLocaleDateString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" }
      )
      const formattedTime = bookingDateTime.toLocaleTimeString(
        language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US",
        { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }
      )
      
      subject = language === "he" ? "הזמנה חדשה זמינה!" : language === "ru" ? "Доступен новый заказ!" : "New booking available!"
      
      const textContent =
        (language === "he"
          ? `שלום,\n\nהזמנה חדשה זמינה לשיוך!\n\nפרטי ההזמנה:\nטיפול: ${data.treatmentName}\nתאריך: ${formattedDate}\nשעה: ${formattedTime}\nעיר: ${data.city}\nמחיר: ₪${data.price}\n\n${data.responseLink ? `לצפייה ואישור: ${data.responseLink}` : ''}`
          : language === "ru"
            ? `Здравствуйте,\n\nДоступен новый заказ для назначения!\n\nДетали заказа:\nПроцедура: ${data.treatmentName}\nДата: ${formattedDate}\nВремя: ${formattedTime}\nГород: ${data.city}\nЦена: ₪${data.price}\n\n${data.responseLink ? `Для просмотра и подтверждения: ${data.responseLink}` : ''}`
            : `Hello,\n\nA new booking is available for assignment!\n\nBooking Details:\nTreatment: ${data.treatmentName}\nDate: ${formattedDate}\nTime: ${formattedTime}\nCity: ${data.city}\nPrice: ₪${data.price}\n\n${data.responseLink ? `To view and confirm: ${data.responseLink}` : ''}`) +
        emailTextSignature
      
      const htmlContent = `
        <h2>${language === "he" ? "הזמנה חדשה זמינה!" : language === "ru" ? "Доступен новый заказ!" : "New booking available!"}</h2>
        <p>${language === "he" ? "שלום," : language === "ru" ? "Здравствуйте," : "Hello,"}</p>
        <p>${language === "he" ? "הזמנה חדשה זמינה לשיוך ומתאימה לפרופיל שלך!" : language === "ru" ? "Новый заказ доступен для назначения и подходит вашему профилю!" : "A new booking is available for assignment and matches your profile!"}</p>
        
        <div class="booking-card">
          <h3>${language === "he" ? "פרטי ההזמנה" : language === "ru" ? "Детали заказа" : "Booking Details"}</h3>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "טיפול:" : language === "ru" ? "Процедура:" : "Treatment:"}</span>
            <span class="value">${data.treatmentName}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "תאריך:" : language === "ru" ? "Дата:" : "Date:"}</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "שעה:" : language === "ru" ? "Время:" : "Time:"}</span>
            <span class="value">${formattedTime}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "עיר:" : language === "ru" ? "Город:" : "City:"}</span>
            <span class="value">${data.city}</span>
          </div>
          <div class="booking-detail">
            <span class="label">${language === "he" ? "מחיר:" : language === "ru" ? "Цена:" : "Price:"}</span>
            <span class="value">₪${data.price}</span>
          </div>
        </div>
        
        <p>${language === "he" ? "ההזמנה זמינה כל עוד לא נתפסה על ידי מטפל אחר. מומלץ לענות מהר!" : language === "ru" ? "Заказ доступен, пока не занят другим специалистом. Рекомендуется отвечать быстро!" : "The booking is available as long as it hasn't been taken by another therapist. We recommend responding quickly!"}</p>
        
        ${data.responseLink ? `
        <p style="text-align: center; margin: 20px 0;">
          <a href="${data.responseLink}" class="button">${language === "he" ? "לצפייה ואישור" : language === "ru" ? "Просмотр и подтверждение" : "View and Confirm"}</a>
        </p>
        ` : ''}
      `
      text = textContent
      html = wrapHtml(htmlContent, subject)
      break
    }

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
