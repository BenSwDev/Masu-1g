// Test script for notification system
const { unifiedNotificationService } = require('./lib/notifications/unified-notification-service')

async function testNotifications() {
  console.log("🧪 Testing notification system...")
  
  // Test guest subscription purchase notification
  const testRecipients = [
    { type: "email", value: "test@example.com", name: "Test User", language: "he" },
    { type: "phone", value: "+972501234567", language: "he" }
  ]
  
  const testMessage = "תודה על רכישתך! קוד המנוי שלך: SUB123456\nלהזמנת טיפול עם המנוי הזן את הקוד בשלב בחירת הטיפול."
  
  try {
    console.log("📧 Testing purchase success notification...")
    const results = await unifiedNotificationService.sendPurchaseSuccess(testRecipients, testMessage)
    
    console.log("\n📊 Results:")
    results.forEach((result, index) => {
      const recipient = testRecipients[index]
      console.log(`  ${recipient.type}: ${result.success ? '✅ Success' : '❌ Failed'} ${result.error ? `(${result.error})` : ''}`)
    })
    
    console.log("\n✅ Test completed!")
  } catch (error) {
    console.error("❌ Test failed:", error)
  }
}

testNotifications() 