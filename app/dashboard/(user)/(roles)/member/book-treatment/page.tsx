>
נעדכן את הקומפוננטה כדי שתקבל ותעביר את התרגומים ל-`BookingWizard`.
```typescript
// ... other imports
import { getTranslations } from "next-intl/server" // Assuming you use next-intl

export default async function BookTreatmentPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    // This should ideally be handled by middleware or a ProtectedRoute component
    return <p>{"common.unauthorizedAccess"}</p>
  }

  const t = await getTranslations() // Fetch all translations
  const initialDataResult = await getBookingInitialData(session.user.id)

  if (!initialDataResult.success || !initialDataResult.data) {
    return (
      // ... existing error handling ...
    );
  }

  // Pass all translations down, or a specific namespace if preferred
  const allTranslations: Record<string, string> = {}
  // A simple way to get all keys, might need adjustment based on your next-intl setup
  // This is a placeholder; you might need a more robust way to get all translation strings
  // For example, if your translations are structured, you might pass t('bookings')
  // For simplicity here, we'll assume initialDataResult.data can hold them or we pass a generic object
  // A better approach: BookingWizard and its children should use useTranslations hook from next-intl
  // For now, let's assume initialData can be augmented or BookingWizard handles it.
  // Let's modify initialData to include translations for simplicity in this example.
  initialDataResult.data.translations = {
    "common.unauthorizedAccess": t("common.unauthorizedAccess"),
    "common.loading": t("common.loading"),
    "common.errorOccurred": t("common.errorOccurred"),
    "common.retry": t("common.retry"),
    "common.currency": t("common.currency"),
    "common.minutes": t("common.minutes"),
    "common.hours": t("common.hours"),
    "common.yes": t("common.yes"),
    "common.no": t("common.no"),
    "common.back": t("common.back"),
    "common.next": t("common.next"),
    "common.submit": t("common.submit"),
    "common.save": t("common.save"),
    "common.cancel": t("common.cancel"),
    "common.confirm": t("common.confirm"),
    "common.close": t("common.close"),
    "common.unknownStep": t("common.unknownStep"),
    "common.totalPrice": t("common.totalPrice"),
    "common.step": t("common.step"),
    "common.of": t("common.of"),
    "common.comingSoon": t("common.comingSoon"),
    // Add all keys used in BookingWizard and its children
    // This is not ideal, direct use of useTranslations in components is better
    // For brevity, I'll list a few more critical ones.
    "bookings.title": t("bookings.title"),
    "bookings.errors.fetchTimeSlotsFailedTitle": t("bookings.errors.fetchTimeSlotsFailedTitle"),
    "bookings.errors.calculatePriceFailedTitle": t("bookings.errors.calculatePriceFailedTitle"),
    "bookings.errors.missingInfoTitle": t("bookings.errors.missingInfoTitle"),
    "bookings.errors.missingInfoSubmit": t("bookings.errors.missingInfoSubmit"),
    "bookings.errors.paymentMethodRequiredTitle": t("bookings.errors.paymentMethodRequiredTitle"),
    "bookings.errors.paymentMethodRequired": t("bookings.errors.paymentMethodRequired"),
    "bookings.success.bookingCreatedTitle": t("bookings.success.bookingCreatedTitle"),
    "bookings.success.bookingCreatedDescription": t("bookings.success.bookingCreatedDescription"),
    "bookings.errors.bookingFailedTitle": t("bookings.errors.bookingFailedTitle"),
    "bookings.errors.unknownBookingError": t("bookings.errors.unknownBookingError"),
    // ... and all other keys from the translation files that are used in the wizard
    // This list needs to be comprehensive for the current approach to work.
  }
  // Add all keys from your translation files that are used by the wizard and its children
  // This is a simplified example. In a real app, you might pass the `t` function or use `useTranslations` in child components.
  const translationKeys = [
    "bookings.steps.source.title",
    "bookings.steps.source.description",
    "bookings.steps.source.redeemSubscription",
    "bookings.steps.source.redeemSubscriptionDesc",
    "bookings.steps.source.available",
    "bookings.steps.source.redeemVoucher",
    "bookings.steps.source.redeemVoucherDesc",
    "bookings.steps.source.newBooking",
    "bookings.steps.source.newBookingDesc",
    "bookings.steps.treatment.title",
    "bookings.steps.treatment.description",
    "bookings.steps.treatment.selectSubscription",
    "bookings.steps.treatment.selectSubscriptionPlaceholder",
    "bookings.unknownSubscription",
    "bookings.subscriptions.remaining",
    "bookings.steps.treatment.selectVoucher",
    "bookings.steps.treatment.selectVoucherPlaceholder",
    "bookings.treatmentVoucher",
    "bookings.steps.treatment.selectTreatment",
    "bookings.noDescription",
    "bookings.priceVariesByDuration",
    "bookings.steps.treatment.noTreatmentsForSelection",
    "bookings.steps.treatment.selectDuration",
    "bookings.steps.treatment.selectDurationPlaceholder",
    "bookings.steps.scheduling.title",
    "bookings.steps.scheduling.description",
    "bookings.steps.scheduling.selectDate",
    "bookings.steps.scheduling.selectTime",
    "bookings.steps.scheduling.selectTimePlaceholder",
    "bookings.steps.scheduling.noSlotsAvailable",
    "bookings.steps.scheduling.selectDateFirst",
    "bookings.steps.scheduling.flexibleTimeLabel",
    "bookings.steps.scheduling.selectAddress",
    "bookings.steps.scheduling.selectAddressPlaceholder",
    "bookings.steps.scheduling.noSavedAddresses",
    "bookings.steps.scheduling.therapistPreference",
    "bookings.steps.scheduling.notes",
    "bookings.steps.scheduling.notesPlaceholder",
    "bookings.steps.summary.title",
    "bookings.steps.summary.description",
    "bookings.steps.summary.bookingDetails",
    "bookings.steps.summary.treatment",
    "bookings.steps.summary.dateTime",
    "bookings.steps.summary.flexibleTime",
    "bookings.steps.summary.address",
    "bookings.steps.summary.therapistPreference",
    "bookings.steps.summary.notes",
    "bookings.steps.summary.couponCode",
    "bookings.steps.summary.couponPlaceholder",
    "bookings.steps.summary.calculatingPrice",
    "bookings.steps.summary.basePrice",
    "bookings.steps.summary.redeemedFromSubscription",
    "bookings.steps.summary.voucherApplied",
    "bookings.steps.summary.couponDiscount",
    "bookings.steps.summary.totalAmount",
    "bookings.steps.summary.fullyCovered",
    "bookings.steps.summary.confirmBooking",
    "bookings.steps.payment.title",
    "bookings.steps.payment.description",
    "bookings.steps.payment.loadingPrice",
    "bookings.steps.payment.confirmTitleNoPayment",
    "bookings.steps.payment.confirmDescNoPayment",
    "bookings.steps.payment.confirmBooking",
    "bookings.steps.payment.selectPaymentMethod",
    "bookings.steps.payment.noSavedPaymentMethods",
    "bookings.steps.payment.payAndConfirm",
    "bookings.steps.confirmation.title",
    "bookings.steps.confirmation.successMessage",
    "bookings.steps.confirmation.bookingId",
    "bookings.steps.confirmation.detailsSentToEmail",
    "bookings.steps.confirmation.viewMyBookings",
    "bookings.steps.confirmation.bookAnotherTreatment",
    "preferences.treatment.genderAny",
    "preferences.treatment.genderMale",
    "preferences.treatment.genderFemale",
    "paymentMethods.fields.expiry",
    "paymentMethods.addNew",
    // Error messages from Zod schemas and actions
    "bookings.validation.sourceRequired",
    "bookings.validation.treatmentRequired",
    "bookings.validation.dateRequired",
    "bookings.validation.timeRequired",
    "bookings.validation.addressRequired",
    "bookings.validation.notesTooLong",
    "bookings.validation.paymentMethodRequired",
    "bookings.validation.durationRequiredForType",
    "bookings.errors.invalidDate",
    "bookings.errors.treatmentNotFound",
    "bookings.errors.durationRequired",
    "bookings.errors.durationNotFound",
    "bookings.errors.invalidTreatmentDuration",
    "bookings.errors.workingHoursNotSet",
    "bookings.errors.fetchTimeSlotsFailed",
    "bookings.errors.calculatePriceFailed",
    "bookings.errors.subscriptionInvalid",
    "bookings.errors.giftVoucherInvalid",
    "bookings.errors.couponInvalid",
    "bookings.errors.subscriptionRedemptionFailed",
    "bookings.errors.voucherRedemptionFailedInactive",
    "bookings.errors.voucherInsufficientBalance",
    "bookings.errors.couponApplyFailed",
    "bookings.errors.bookingCreationFailedUnknown",
    "bookings.errors.createBookingFailed",
    "bookings.errors.bookingNotFound",
    "bookings.errors.cannotCancelAlreadyProcessed",
    "bookings.errors.cancellationFailedUnknown",
    "bookings.errors.cancelBookingFailed",
    "bookings.errors.initialDataLoadFailed",
    "bookings.errors.initialDataFetchFailed",
    "bookings.messages.closedOnSelectedDate",
    "bookings.surcharges.specialTime",
    "bookings.voucherUsage.redeemedForBooking",
    // Add any other keys used...
  ]

  translationKeys.forEach((key) => {
    initialDataResult.data.translations[key] = t(key)
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">
        {initialDataResult.data.translations["bookings.title"] || "Book a Treatment"}
      </h1>
      <BookingWizard initialData={initialDataResult.data} currentUser={session.user} />
    </div>
  )
}
