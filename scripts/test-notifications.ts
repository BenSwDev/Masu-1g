import { unifiedNotificationService } from "../lib/notifications/unified-notification-service"

async function testNotifications() {
  console.log("🧪 Testing notification system...")

  // Test service status
  const status = unifiedNotificationService.serviceStatus
  console.log("📊 Service Status:")
  console.log(`  Email configured: ${status.isEmailConfigured}`)
  console.log(`  SMS configured: ${status.isSMSConfigured}`)
  console.log(`  Environment: ${status.manager.environment}`)

  // Test guest subscription purchase notification
  const testRecipients = [
    {
      type: "email" as const,
      value: "test@example.com",
      name: "Test User",
      language: "he" as const,
    },
    { type: "phone" as const, value: "+972501234567", language: "he" as const },
  ]

  const testMessage =
    "תודה על רכישתך! קוד המנוי שלך: SUB123456\nלהזמנת טיפול עם המנוי הזן את הקוד בשלב בחירת הטיפול."

  try {
    console.log("\n📧 Testing purchase success notification...")
    const results = await unifiedNotificationService.sendPurchaseSuccess(
      testRecipients,
      testMessage
    )

    console.log("\n📊 Results:")
    results.forEach((result, index) => {
      const recipient = testRecipients[index]
      console.log(
        `  ${recipient.type}: ${result.success ? "✅ Success" : "❌ Failed"} ${result.error ? `(${result.error})` : ""}`
      )
      if (result.messageId) {
        console.log(`    Message ID: ${result.messageId}`)
      }
    })

    console.log("\n✅ Test completed!")
  } catch (error) {
    console.error("❌ Test failed:", error)
  }
}

testNotifications().catch(console.error)
