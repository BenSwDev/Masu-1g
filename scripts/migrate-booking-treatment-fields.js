// @ts-check
// Migration script: Add allowTherapistGenderSelection to treatments and isBookingForSomeoneElse to bookings
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/masu';

async function migrate() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const Treatment = mongoose.connection.collection('treatments');
  const Booking = mongoose.connection.collection('bookings');

  // Treatments: add allowTherapistGenderSelection: false if missing
  const treatmentResult = await Treatment.updateMany(
    { allowTherapistGenderSelection: { $exists: false } },
    { $set: { allowTherapistGenderSelection: false } }
  );
  console.log(`Treatments updated: ${treatmentResult.modifiedCount}`);

  // Bookings: add isBookingForSomeoneElse: false if missing
  const bookingResult = await Booking.updateMany(
    { isBookingForSomeoneElse: { $exists: false } },
    { $set: { isBookingForSomeoneElse: false } }
  );
  console.log(`Bookings updated: ${bookingResult.modifiedCount}`);

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 