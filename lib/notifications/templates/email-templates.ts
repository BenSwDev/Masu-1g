export interface NotificationData {
  type: "welcome" | "passwordReset" | "inviteUser" | "adminPasswordReset" // Assuming adminPasswordReset can use passwordReset
  userName: string
  email: string
  resetLink?: string
  inviteLink?: string
  organizationName?: string
}

export const getEmailTemplate = (data: NotificationData, language = "en") => {
  let subject = ""
  let text = ""
  let html = ""

  // Common email wrapper structure (simplified from original project for this example)
  // In a real scenario, you'd use the more complex wrapper from your project.
  const wrapHtml = (content: string, emailSubject: string): string => `
   <!DOCTYPE html>
   <html lang="${language}">
   <head>
     <meta charset="UTF-8">
     <title>${emailSubject}</title>
     <style>
       body { font-family: sans-serif; margin: 20px; padding: 0; }
       .container { max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; }
       .button { display: inline-block; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
     </style>
   </head>
   <body>
     <div class="container">
       ${content}
       <hr/>
       <p><small>If you have any questions, please contact us. All rights reserved &copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_APP_NAME || "Masu"}</small></p>
     </div>
   </body>
   </html>
  `

  switch (data.type) {
    case "welcome":
      subject = language === "he" ? "ברוכים הבאים!" : "Welcome!"
      const welcomeTextContent = `Hello ${data.userName},\n\nWelcome to ${process.env.NEXT_PUBLIC_APP_NAME || "Masu"}!\n\nThanks,\nThe ${process.env.EMAIL_FROM || "Masu"} Team`
      const welcomeHtmlContent = `
        <p>Hello ${data.userName},</p>
        <p>Welcome to ${process.env.NEXT_PUBLIC_APP_NAME || "Masu"}!</p>
        <p>Thanks,<br/>The ${process.env.EMAIL_FROM || "Masu"} Team</p>
      `
      text = welcomeTextContent
      html = wrapHtml(welcomeHtmlContent, subject)
      break

    case "passwordReset":
      subject = language === "he" ? `איפוס סיסמה עבור ${data.userName}` : `Password Reset for ${data.userName}`
      const passwordResetTextContent = `Hello ${data.userName},\n\nPlease click the following link to reset your password: ${data.resetLink}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe ${process.env.EMAIL_FROM || "Masu"} Team`
      const passwordResetHtmlContent = `
        <p>Hello ${data.userName},</p>
        <p>Please click the link below to reset your password:</p>
        <p><a href="${data.resetLink}" class="button">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thanks,<br/>The ${process.env.EMAIL_FROM || "Masu"} Team</p>
      `
      text = passwordResetTextContent
      html = wrapHtml(passwordResetHtmlContent, subject)
      break

    case "inviteUser":
      subject = language === "he" ? `הוזמנת ל ${data.organizationName}` : `You're invited to ${data.organizationName}`
      const inviteUserTextContent = `Hello ${data.userName},\n\nYou have been invited to join ${data.organizationName} on ${process.env.NEXT_PUBLIC_APP_NAME || "Masu"}.\n\nPlease click the following link to accept the invitation: ${data.inviteLink}\n\nThanks,\nThe ${process.env.EMAIL_FROM || "Masu"} Team`
      const inviteUserHtmlContent = `
        <p>Hello ${data.userName},</p>
        <p>You have been invited to join ${data.organizationName} on ${process.env.NEXT_PUBLIC_APP_NAME || "Masu"}.</p>
        <p>Please click the link below to accept the invitation:</p>
        <p><a href="${data.inviteLink}" class="button">Accept Invitation</a></p>
        <p>Thanks,<br/>The ${process.env.EMAIL_FROM || "Masu"} Team</p>
      `
      text = inviteUserTextContent
      html = wrapHtml(inviteUserHtmlContent, subject)
      break

    default: // Corrected default case
      subject = "Notification"
      const defaultTextContent = `Hello,\n\nThis is a notification from ${process.env.NEXT_PUBLIC_APP_NAME || "Masu"}.`
      const defaultHtmlContent = `<p>Hello,</p><p>This is a notification from ${process.env.NEXT_PUBLIC_APP_NAME || "Masu"}.</p>`
      text = defaultTextContent
      html = wrapHtml(defaultHtmlContent, subject)
      break
  }

  return { subject, text, html }
}
