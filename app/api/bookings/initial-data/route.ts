import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import dbConnect from '@/lib/db/mongoose'
import UserSubscription from '@/lib/db/models/user-subscription'
import GiftVoucher from '@/lib/db/models/gift-voucher'
import User from '@/lib/db/models/user'
import Address from '@/lib/db/models/address'
import Treatment from '@/lib/db/models/treatment'
import { WorkingHoursSettings } from '@/lib/db/models/working-hours'
import Coupon from '@/lib/db/models/coupon'
import PaymentMethod from '@/lib/db/models/payment-method'
import { getActivePaymentMethods as fetchUserActivePaymentMethods } from '@/actions/payment-method-actions'
import { logger } from '@/lib/logs/logger'

// GET /api/bookings/initial-data - Get initial booking data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // For admin - no user ID required
    const session = await getServerSession(authOptions)
    
    if (userId) {
      // For user booking - verify authorization
      if (!session || session.user.id !== userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      // For admin booking - verify admin role
      if (!session?.user?.roles?.includes("admin")) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    await dbConnect()

    if (userId) {
      // User booking initial data
      const [
        userSubscriptionsResult,
        giftVouchersResult,
        userResult,
        addressesResult,
        paymentMethodsResult,
        treatmentsResult,
        workingHoursResult,
      ] = await Promise.allSettled([
        UserSubscription.find({ userId, status: "active", remainingQuantity: { $gt: 0 } })
          .populate("subscriptionId")
          .populate({ path: "treatmentId", model: Treatment, populate: { path: "durations" } })
          .lean(),
        GiftVoucher.find({
          $or: [{ ownerUserId: userId }, { recipientEmail: session.user.email }],
          status: { $in: ["active", "partially_used", "sent"] },
          validUntil: { $gte: new Date() },
          isActive: true,
        }).lean(),
        User.findById(userId).select("preferences name email phone notificationPreferences treatmentPreferences").lean(),
        Address.find({ userId, isArchived: { $ne: true } }).lean(),
        fetchUserActivePaymentMethods(),
        Treatment.find({ isActive: true }).populate("durations").lean(),
        WorkingHoursSettings.findOne().lean(),
      ])

      const getFulfilledValue = (result: PromiseSettledResult<any>, defaultValue: any = null) =>
        result.status === "fulfilled" ? result.value : defaultValue

      const activeUserSubscriptions = getFulfilledValue(userSubscriptionsResult, [])
      const usableGiftVouchers = getFulfilledValue(giftVouchersResult, [])
      const user = getFulfilledValue(userResult)
      const userAddresses = getFulfilledValue(addressesResult, [])

      const paymentMethodsSettledResult = paymentMethodsResult.status === "fulfilled" ? paymentMethodsResult.value : null
      let userPaymentMethods: any[] = []
      if (
        paymentMethodsSettledResult &&
        paymentMethodsSettledResult.success &&
        paymentMethodsSettledResult.paymentMethods
      ) {
        userPaymentMethods = paymentMethodsSettledResult.paymentMethods
      } else if (paymentMethodsSettledResult && paymentMethodsSettledResult.error) {
        logger.warn(
          `Failed to fetch payment methods for user ${userId} in getBookingInitialData: ${paymentMethodsSettledResult.error}`,
        )
      } else if (paymentMethodsResult.status === "rejected") {
        logger.error(`Failed to fetch payment methods for user ${userId}: ${paymentMethodsResult.reason}`)
      }

      const activeTreatments = getFulfilledValue(treatmentsResult, [])
      const workingHoursSettings = getFulfilledValue(workingHoursResult)

      if (!user || !activeTreatments || !workingHoursSettings) {
        logger.error("Failed to load critical initial data for booking (enhanced):", {
          userId,
          userFound: !!user,
          treatmentsFound: !!activeTreatments,
          settingsFound: !!workingHoursSettings,
        })
        return NextResponse.json({ success: false, error: "bookings.errors.initialDataLoadFailed" }, { status: 500 })
      }

      const notificationPrefs = user.notificationPreferences || {}
      const treatmentPrefs = user.treatmentPreferences || {}

      const populatedUserSubscriptions = activeUserSubscriptions.map((sub: any) => {
        if (sub.treatmentId && sub.treatmentId.pricingType === "duration_based" && sub.selectedDurationId) {
          const treatmentDoc = sub.treatmentId
          if (treatmentDoc.durations) {
            const selectedDuration = treatmentDoc.durations.find(
              (d: any) => d._id.toString() === sub.selectedDurationId.toString(),
            )
            return { ...sub, selectedDurationDetails: selectedDuration }
          }
        }
        return sub
      })

      const enhancedUsableGiftVouchers = usableGiftVouchers.map((voucher: any) => {
        let treatmentName = voucher.treatmentName
        let selectedDurationName = voucher.selectedDurationName

        if (voucher.voucherType === "treatment" && voucher.treatmentId) {
          const treatmentDetails = activeTreatments.find(
            (t: any) => t._id.toString() === voucher.treatmentId?.toString(),
          )
          if (treatmentDetails) {
            treatmentName = treatmentDetails.name
            if (treatmentDetails.pricingType === "duration_based" && voucher.selectedDurationId) {
              const durationDetails = treatmentDetails.durations?.find(
                (d: any) => d._id.toString() === voucher.selectedDurationId?.toString(),
              )
              if (durationDetails) selectedDurationName = `${durationDetails.minutes} min`
            } else {
              selectedDurationName = ""
            }
          }
        }
        return {
          ...voucher,
          treatmentName,
          selectedDurationName,
        }
      })

      const data = {
        activeUserSubscriptions: populatedUserSubscriptions,
        usableGiftVouchers: enhancedUsableGiftVouchers,
        userPreferences: {
          therapistGender: treatmentPrefs.therapistGender || "any",
          notificationMethods: notificationPrefs.methods || ["email"],
          notificationLanguage: notificationPrefs.language || "he",
        },
        userAddresses,
        userPaymentMethods,
        activeTreatments,
        workingHoursSettings,
        currentUser: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      }

      return NextResponse.json({ success: true, data: JSON.parse(JSON.stringify(data)) })

    } else {
      // Admin booking initial data
      const treatments = await Treatment.find({ isActive: true })
        .select("name description pricingType fixedPrice defaultDurationMinutes durations")
        .lean()

      const paymentMethodsRaw = await PaymentMethod.find({ isSystemMethod: true })
        .select("type displayName isActive")
        .lean()

      const workingHours = await WorkingHoursSettings.findOne().lean()

      const activeCoupons = await Coupon.find({
        isActive: true,
        validUntil: { $gte: new Date() },
        $or: [
          { usageLimit: 0 },
          { $expr: { $lt: ["$timesUsed", "$usageLimit"] } }
        ]
      }).lean()

      const activeGiftVouchers = await GiftVoucher.find({
        status: { $in: ["active", "partially_used", "sent"] },
        validUntil: { $gte: new Date() },
        isActive: true
      }).lean()

      return NextResponse.json({
        success: true,
        data: {
          treatments,
          paymentMethods: paymentMethodsRaw || [],
          workingHours,
          activeCoupons,
          activeGiftVouchers
        }
      })
    }

  } catch (error) {
    logger.error("Error fetching initial booking data:", { error, userId })
    return NextResponse.json({ 
      success: false, 
      error: "bookings.errors.initialDataFetchFailed" 
    }, { status: 500 })
  }
} 