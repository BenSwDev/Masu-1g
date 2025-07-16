import { config } from 'dotenv';
config({ path: '.env.local' });

async function testDrawerPaymentFlow() {
  console.log('🧪 Testing COMPLETE DRAWER Payment Flow');
  console.log('======================================');
  console.log('📧 Email: benswissa@gmail.com');
  console.log('💰 Amount: Real amount');
  console.log('📄 Document: Receipt');
  console.log('🎯 Flow: Drawer → Success → Email → Auto-close → Redirect');
  console.log('');
  
  try {
    const response = await fetch('http://localhost:3000/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: 'drawer_test_' + Date.now(),
        amount: 129.90,
        description: '🧪 Test Complete Drawer Flow + Email Receipt',
        customerName: 'בנימין סוויסה',
        customerEmail: 'benswissa@gmail.com',
        customerPhone: '0501234567',
        type: 'booking',
        createDocument: true,
        documentType: 'Receipt',
        drawerMode: true // ✅ כאן המפתח!
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.redirectUrl) {
      console.log('🎉 SUCCESS! Drawer payment URL generated:');
      console.log('');
      console.log('🔗 Payment URL (with drawer=true):');
      console.log(result.redirectUrl);
      console.log('');
      console.log('🎯 Expected Flow:');
      console.log('1. Open URL in browser (iframe in drawer)');
      console.log('2. Pay with test card: 4580458045804580');
      console.log('3. See success message in drawer: "קיבלת אישור תשלום במייל"');
      console.log('4. Drawer auto-closes after 2 seconds');
      console.log('5. System creates booking and redirects to payment-success');
      console.log('6. Check benswissa@gmail.com for receipt email!');
      console.log('');
      console.log('📧 ✅ Email receipt should be sent by CARDCOM');
      console.log('🎯 ✅ Full booking flow should complete');
      
    } else {
      console.log('❌ Failed:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDrawerPaymentFlow(); 