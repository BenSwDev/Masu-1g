import { getServerSession } from "next-auth"
import { getTranslations } from "next-intl/server"
import { authOptions } from "@/lib/auth/auth" // Corrected path
import { getBookingInitialData } from "@/actions/booking-actions" // Corrected path
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard" // Corrected path
import type { UserSessionData } from "@/types/next-auth"

export default async function BookTreatmentPage() {
  const tSrv = await getTranslations() // Using a different variable name for server translations

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return <p>{tSrv("common.unauthorizedAccess")}</p>
  }

  const initialDataResult = await getBookingInitialData(session.user.id)

  if (!initialDataResult.success || !initialDataResult.data) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4 text-destructive-foreground">{tSrv("common.errorOccurred")}</h1>
        <p className="text-muted-foreground">
          {initialDataResult.error
            ? tSrv(initialDataResult.error as any) // Cast to any if keys are dynamic
            : tSrv("bookings.errors.initialDataLoadFailed")}
        </p>
        {/* Add a retry button or link to home if appropriate */}
      </div>
    )
  }

  // Prepare translations to be passed to the client component
  // It's generally better for client components to use `useTranslations` from `next-intl/react`
  // but if passing a bundle is necessary:
  const translationsForClient: Record<string, string> = {
    "common.unauthorizedAccess": tSrv("common.unauthorizedAccess"),
    "common.loading": tSrv("common.loading"),
    "common.errorOccurred": tSrv("common.errorOccurred"),
    "common.retry": tSrv("common.retry"),
    "common.currency": tSrv("common.currency"),
    "common.minutes": tSrv("common.minutes"),
    "common.hours": tSrv("common.hours"),
    "common.yes": tSrv("common.yes"),
    "common.no": tSrv("common.no"),
    "common.back": tSrv("common.back"),
    "common.next": tSrv("common.next"),
    "common.submit": tSrv("common.submit"),
    "common.save": tSrv("common.save"),
    "common.cancel": tSrv("common.cancel"),
    "common.confirm": tSrv("common.confirm"),
    "common.close": tSrv("common.close"),
    "common.unknownStep": tSrv("common.unknownStep"),
    "common.totalPrice": tSrv("common.totalPrice"),
    "common.step": tSrv("common.step"),
    "common.of": tSrv("common.of"),
    "common.comingSoon": tSrv("common.comingSoon"),
    "common.error": tSrv("common.error"),
    "common.notAvailable": tSrv("common.notAvailable"),
    "common.priceSummary": tSrv("common.priceSummary"),

    "bookings.title": tSrv("bookings.title"),
    "bookings.errors.fetchTimeSlotsFailedTitle": tSrv("bookings.errors.fetchTimeSlotsFailedTitle"),
    "bookings.errors.calculatePriceFailedTitle": tSrv("bookings.errors.calculatePriceFailedTitle"),
    "bookings.errors.missingInfoTitle": tSrv("bookings.errors.missingInfoTitle"),
    "bookings.errors.missingInfoSubmit": tSrv("bookings.errors.missingInfoSubmit"),
    "bookings.errors.paymentMethodRequiredTitle": tSrv("bookings.errors.paymentMethodRequiredTitle"),
    "bookings.errors.paymentMethodRequired": tSrv("bookings.errors.paymentMethodRequired"),
    "bookings.success.bookingCreatedTitle": tSrv("bookings.success.bookingCreatedTitle"),
    "bookings.success.bookingCreatedDescription": tSrv("bookings.success.bookingCreatedDescription"),
    "bookings.errors.bookingFailedTitle": tSrv("bookings.errors.bookingFailedTitle"),
    "bookings.errors.unknownBookingError": tSrv("bookings.errors.unknownBookingError"),
    "bookings.errors.priceCalculationUnavailable": tSrv("bookings.errors.priceCalculationUnavailable"),

    "bookings.steps.source.title": tSrv("bookings.steps.source.title"),
    "bookings.steps.source.description": tSrv("bookings.steps.source.description"),
    "bookings.steps.source.redeemSubscription": tSrv("bookings.steps.source.redeemSubscription"),
    "bookings.steps.source.redeemSubscriptionDesc": tSrv("bookings.steps.source.redeemSubscriptionDesc"),
    "bookings.steps.source.available": tSrv("bookings.steps.source.available"),
    "bookings.steps.source.redeemVoucher": tSrv("bookings.steps.source.redeemVoucher"),
    "bookings.steps.source.redeemVoucherDesc": tSrv("bookings.steps.source.redeemVoucherDesc"),
    "bookings.steps.source.newBooking": tSrv("bookings.steps.source.newBooking"),
    "bookings.steps.source.newBookingDesc": tSrv("bookings.steps.source.newBookingDesc"),

    "bookings.steps.treatment.title": tSrv("bookings.steps.treatment.title"),
    "bookings.steps.treatment.description": tSrv("bookings.steps.treatment.description"),
    "bookings.steps.treatment.selectSubscription": tSrv("bookings.steps.treatment.selectSubscription"),
    "bookings.steps.treatment.selectSubscriptionPlaceholder": tSrv(
      "bookings.steps.treatment.selectSubscriptionPlaceholder",
    ),
    "bookings.unknownSubscription": tSrv("bookings.unknownSubscription"),
    "bookings.subscriptions.remaining": tSrv("bookings.subscriptions.remaining"),
    "bookings.steps.treatment.selectVoucher": tSrv("bookings.steps.treatment.selectVoucher"),
    "bookings.steps.treatment.selectVoucherPlaceholder": tSrv("bookings.steps.treatment.selectVoucherPlaceholder"),
    "bookings.treatmentVoucher": tSrv("bookings.treatmentVoucher"),
    "bookings.steps.treatment.selectTreatment": tSrv("bookings.steps.treatment.selectTreatment"),
    "bookings.noDescription": tSrv("bookings.noDescription"),
    "bookings.priceVariesByDuration": tSrv("bookings.priceVariesByDuration"),
    "bookings.steps.treatment.noTreatmentsForSelection": tSrv("bookings.steps.treatment.noTreatmentsForSelection"),
    "bookings.steps.treatment.selectDuration": tSrv("bookings.steps.treatment.selectDuration"),
    "bookings.steps.treatment.selectDurationPlaceholder": tSrv("bookings.steps.treatment.selectDurationPlaceholder"),

    "bookings.steps.scheduling.title": tSrv("bookings.steps.scheduling.title"),
    "bookings.steps.scheduling.description": tSrv("bookings.steps.scheduling.description"),
    "bookings.steps.scheduling.selectDate": tSrv("bookings.steps.scheduling.selectDate"),
    "bookings.steps.scheduling.selectTime": tSrv("bookings.steps.scheduling.selectTime"),
    "bookings.steps.scheduling.selectTimePlaceholder": tSrv("bookings.steps.scheduling.selectTimePlaceholder"),
    "bookings.steps.scheduling.noSlotsAvailable": tSrv("bookings.steps.scheduling.noSlotsAvailable"),
    "bookings.steps.scheduling.selectDateFirst": tSrv("bookings.steps.scheduling.selectDateFirst"),
    "bookings.steps.scheduling.flexibleTimeLabel": tSrv("bookings.steps.scheduling.flexibleTimeLabel"),
    "bookings.steps.scheduling.selectAddress": tSrv("bookings.steps.scheduling.selectAddress"),
    "bookings.steps.scheduling.selectAddressPlaceholder": tSrv("bookings.steps.scheduling.selectAddressPlaceholder"),
    "bookings.steps.scheduling.noSavedAddresses": tSrv("bookings.steps.scheduling.noSavedAddresses"),
    "bookings.steps.scheduling.therapistPreference": tSrv("bookings.steps.scheduling.therapistPreference"),
    "bookings.steps.scheduling.notes": tSrv("bookings.steps.scheduling.notes"),
    "bookings.steps.scheduling.notesPlaceholder": tSrv("bookings.steps.scheduling.notesPlaceholder"),

    "bookings.steps.summary.title": tSrv("bookings.steps.summary.title"),
    "bookings.steps.summary.description": tSrv("bookings.steps.summary.description"),
    "bookings.steps.summary.bookingDetails": tSrv("bookings.steps.summary.bookingDetails"),
    "bookings.steps.summary.treatment": tSrv("bookings.steps.summary.treatment"),
    "bookings.steps.summary.dateTime": tSrv("bookings.steps.summary.dateTime"),
    "bookings.steps.summary.flexibleTime": tSrv("bookings.steps.summary.flexibleTime"),
    "bookings.steps.summary.address": tSrv("bookings.steps.summary.address"),
    "bookings.steps.summary.therapistPreference": tSrv("bookings.steps.summary.therapistPreference"),
    "bookings.steps.summary.notes": tSrv("bookings.steps.summary.notes"),
    "bookings.steps.summary.couponCode": tSrv("bookings.steps.summary.couponCode"),
    "bookings.steps.summary.couponPlaceholder": tSrv("bookings.steps.summary.couponPlaceholder"),
    "bookings.steps.summary.couponDesc": tSrv("bookings.steps.summary.couponDesc"),
    "bookings.steps.summary.calculatingPrice": tSrv("bookings.steps.summary.calculatingPrice"),
    "bookings.steps.summary.basePrice": tSrv("bookings.steps.summary.basePrice"),
    "bookings.steps.summary.redeemedFromSubscription": tSrv("bookings.steps.summary.redeemedFromSubscription"),
    "bookings.steps.summary.voucherApplied": tSrv("bookings.steps.summary.voucherApplied"),
    "bookings.steps.summary.couponDiscount": tSrv("bookings.steps.summary.couponDiscount"),
    "bookings.steps.summary.totalAmount": tSrv("bookings.steps.summary.totalAmount"),
    "bookings.steps.summary.fullyCovered": tSrv("bookings.steps.summary.fullyCovered"),
    "bookings.steps.summary.confirmBooking": tSrv("bookings.steps.summary.confirmBooking"),

    "bookings.steps.payment.title": tSrv("bookings.steps.payment.title"),
    "bookings.steps.payment.description": tSrv("bookings.steps.payment.description"),
    "bookings.steps.payment.loadingPrice": tSrv("bookings.steps.payment.loadingPrice"),
    "bookings.steps.payment.confirmTitleNoPayment": tSrv("bookings.steps.payment.confirmTitleNoPayment"),
    "bookings.steps.payment.confirmDescNoPayment": tSrv("bookings.steps.payment.confirmDescNoPayment"),
    "bookings.steps.payment.confirmBooking": tSrv("bookings.steps.payment.confirmBooking"),
    "bookings.steps.payment.selectPaymentMethod": tSrv("bookings.steps.payment.selectPaymentMethod"),
    "bookings.steps.payment.noSavedPaymentMethods": tSrv("bookings.steps.payment.noSavedPaymentMethods"),
    "bookings.steps.payment.payAndConfirm": tSrv("bookings.steps.payment.payAndConfirm"),

    "bookings.steps.confirmation.title": tSrv("bookings.steps.confirmation.title"),
    "bookings.steps.confirmation.successMessage": tSrv("bookings.steps.confirmation.successMessage"),
    "bookings.steps.confirmation.bookingId": tSrv("bookings.steps.confirmation.bookingId"),
    "bookings.steps.confirmation.detailsSentToEmail": tSrv("bookings.steps.confirmation.detailsSentToEmail"),
    "bookings.steps.confirmation.viewMyBookings": tSrv("bookings.steps.confirmation.viewMyBookings"),
    "bookings.steps.confirmation.bookAnotherTreatment": tSrv("bookings.steps.confirmation.bookAnotherTreatment"),

    "preferences.treatment.genderAny": tSrv("preferences.treatment.genderAny"),
    "preferences.treatment.genderMale": tSrv("preferences.treatment.genderMale"),
    "preferences.treatment.genderFemale": tSrv("preferences.treatment.genderFemale"),

    "paymentMethods.fields.expiry": tSrv("paymentMethods.fields.expiry"),
    "paymentMethods.addNew": tSrv("paymentMethods.addNew"),

    "bookings.validation.sourceRequired": tSrv("bookings.validation.sourceRequired"),
    "bookings.validation.treatmentRequired": tSrv("bookings.validation.treatmentRequired"),
    "bookings.validation.dateRequired": tSrv("bookings.validation.dateRequired"),
    "bookings.validation.timeRequired": tSrv("bookings.validation.timeRequired"),
    "bookings.validation.addressRequired": tSrv("bookings.validation.addressRequired"),
    "bookings.validation.notesTooLong": tSrv("bookings.validation.notesTooLong"),
    "bookings.validation.paymentMethodRequired": tSrv("bookings.validation.paymentMethodRequired"),
    "bookings.validation.durationRequiredForType": tSrv("bookings.validation.durationRequiredForType"),

    "bookings.errors.invalidDate": tSrv("bookings.errors.invalidDate"),
    "bookings.errors.treatmentNotFound": tSrv("bookings.errors.treatmentNotFound"),
    "bookings.errors.durationRequired": tSrv("bookings.errors.durationRequired"),
    "bookings.errors.durationNotFound": tSrv("bookings.errors.durationNotFound"),
    "bookings.errors.invalidTreatmentDuration": tSrv("bookings.errors.invalidTreatmentDuration"),
    "bookings.errors.workingHoursNotSet": tSrv("bookings.errors.workingHoursNotSet"),
    "bookings.errors.fetchTimeSlotsFailed": tSrv("bookings.errors.fetchTimeSlotsFailed"),
    "bookings.errors.calculatePriceFailed": tSrv("bookings.errors.calculatePriceFailed"),
    "bookings.errors.subscriptionInvalid": tSrv("bookings.errors.subscriptionInvalid"),
    "bookings.errors.giftVoucherInvalid": tSrv("bookings.errors.giftVoucherInvalid"),
    "bookings.errors.couponInvalid": tSrv("bookings.errors.couponInvalid"),
    "bookings.errors.subscriptionRedemptionFailed": tSrv("bookings.errors.subscriptionRedemptionFailed"),
    "bookings.errors.voucherRedemptionFailedInactive": tSrv("bookings.errors.voucherRedemptionFailedInactive"),
    "bookings.errors.voucherInsufficientBalance": tSrv("bookings.errors.voucherInsufficientBalance"),
    "bookings.errors.couponApplyFailed": tSrv("bookings.errors.couponApplyFailed"),
    "bookings.errors.bookingCreationFailedUnknown": tSrv("bookings.errors.createBookingFailed"),
    "bookings.errors.bookingNotFound": tSrv("bookings.errors.bookingNotFound"),
    "bookings.errors.cannotCancelAlreadyProcessed": tSrv("bookings.errors.cannotCancelAlreadyProcessed"),
    "bookings.errors.cancellationFailedUnknown": tSrv("bookings.errors.cancellationFailedUnknown"),
    "bookings.errors.cancelBookingFailed": tSrv("bookings.errors.cancelBookingFailed"),
    "bookings.errors.initialDataLoadFailed": tSrv("bookings.errors.initialDataLoadFailed"),
    "bookings.errors.initialDataFetchFailed": tSrv("bookings.errors.initialDataFetchFailed"),

    "bookings.messages.closedOnSelectedDate": tSrv("bookings.messages.closedOnSelectedDate"),
    "bookings.surcharges.specialTime": tSrv("bookings.surcharges.specialTime"),
    "bookings.voucherUsage.redeemedForBooking": tSrv("bookings.voucherUsage.redeemedForBooking"),
  }

  initialDataResult.data.translations = translationsForClient

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">
        {translationsForClient["bookings.title"] || "Book a Treatment"}
      </h1>
      <BookingWizard
        initialData={initialDataResult.data}
        currentUser={session.user as UserSessionData} // Pass the full user object
      />
    </div>
  )
}
