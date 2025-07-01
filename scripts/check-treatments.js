const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Simple treatment schema for testing
const treatmentSchema = new mongoose.Schema({
  name: String,
  category: String,
  isActive: Boolean,
  pricingType: String,
  fixedPrice: Number,
  description: String
});

const Treatment = mongoose.model('Treatment', treatmentSchema);

async function checkTreatments() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Count all treatments
    const totalTreatments = await Treatment.countDocuments();
    console.log(`📊 Total treatments in database: ${totalTreatments}`);
    
    // Count active treatments
    const activeTreatments = await Treatment.countDocuments({ isActive: true });
    console.log(`✅ Active treatments: ${activeTreatments}`);
    
    // Get sample treatments
    const sampleTreatments = await Treatment.find({ isActive: true })
      .select('name category pricingType fixedPrice')
      .limit(5)
      .lean();
    
    console.log('📋 Sample active treatments:');
    sampleTreatments.forEach((treatment, index) => {
      console.log(`  ${index + 1}. ${treatment.name} (${treatment.category}) - ${treatment.pricingType}`);
    });
    
    // Test the exact query from the API
    console.log('\n🔍 Testing exact API query...');
    const apiQuery = Treatment.find({ isActive: true })
      .select("name description durations pricingType fixedPrice category")
      .lean()
      .maxTimeMS(8000);
    
    const startTime = Date.now();
    const apiResults = await apiQuery.exec();
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Query completed in ${duration}ms`);
    console.log(`📊 API query returned ${apiResults.length} treatments`);
    
    // Group by category
    const byCategory = apiResults.reduce((acc, treatment) => {
      const category = treatment.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Treatments by category:');
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTreatments(); 