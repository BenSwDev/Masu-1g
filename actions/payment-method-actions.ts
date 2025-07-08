"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { PaymentMethod } from "@/lib/db/models/payment-method"
import dbConnect from "@/lib/db/mongoose"

export interface PaymentMethodFormData {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardHolderName: string
  cardName?: string
  isDefault?: boolean
}

export async function getPaymentMethods() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const paymentMethods = await PaymentMethod.find({ userId: session.user.id }).lean()

    return {
      success: true,
      paymentMethods,
    }
  } catch (error) {
    return { success: false, error: "Failed to fetch payment methods" }
  }
}

export async function createPaymentMethod(data: PaymentMethodFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    // If this is set as default, unset all other defaults
    if (data.isDefault) {
      await PaymentMethod.updateMany({ userId: session.user.id }, { isDefault: false })
    }

    // Generate card name if not provided
    let cardName = data.cardName
    if (!cardName) {
      const existingCount = await PaymentMethod.countDocuments({ userId: session.user.id })
      const lastFourDigits = data.cardNumber.slice(-4)
      cardName = `כרטיס ${lastFourDigits}`
    }

    const paymentMethod = new PaymentMethod({
      userId: session.user.id,
      cardNumber: data.cardNumber,
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      cvv: data.cvv,
      cardHolderName: data.cardHolderName,
      cardName,
      isDefault: data.isDefault || false,
    })

    await paymentMethod.save()

    // אל תעשה revalidatePath כי אנחנו רוצים עדכון מיידי
    // revalidatePath("/dashboard/member/payment-methods")

    return { success: true, paymentMethod: JSON.parse(JSON.stringify(paymentMethod)) }
  } catch (error) {
    console.error("Error creating payment method:", error)
    return { success: false, error: "Failed to create payment method" }
  }
}

export async function updatePaymentMethod(id: string, data: PaymentMethodFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    // If this is set as default, unset all other defaults
    if (data.isDefault) {
      await PaymentMethod.updateMany({ userId: session.user.id, _id: { $ne: id } }, { isDefault: false })
    }

    const paymentMethod = await PaymentMethod.findOneAndUpdate({ _id: id, userId: session.user.id }, data, {
      new: true,
    })

    if (!paymentMethod) {
      throw new Error("Payment method not found")
    }

    // אל תעשה revalidatePath כי אנחנו רוצים עדכון מיידי
    // revalidatePath("/dashboard/member/payment-methods")

    return { success: true, paymentMethod: JSON.parse(JSON.stringify(paymentMethod)) }
  } catch (error) {
    console.error("Error updating payment method:", error)
    return { success: false, error: "Failed to update payment method" }
  }
}

export async function deletePaymentMethod(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const paymentMethod = await PaymentMethod.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    })

    if (!paymentMethod) {
      throw new Error("Payment method not found")
    }

    // אל תעשה revalidatePath כי אנחנו רוצים עדכון מיידי
    // revalidatePath("/dashboard/member/payment-methods")

    return { success: true, deletedId: id }
  } catch (error) {
    console.error("Error deleting payment method:", error)
    return { success: false, error: "Failed to delete payment method" }
  }
}

export async function setDefaultPaymentMethod(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    // Unset all defaults first
    await PaymentMethod.updateMany({ userId: session.user.id }, { isDefault: false })

    // Set the selected one as default
    const paymentMethod = await PaymentMethod.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { isDefault: true },
      { new: true },
    )

    if (!paymentMethod) {
      throw new Error("Payment method not found")
    }

    // אל תעשה revalidatePath כי אנחנו רוצים עדכון מיידי
    // revalidatePath("/dashboard/member/payment-methods")

    return { success: true, paymentMethod: JSON.parse(JSON.stringify(paymentMethod)) }
  } catch (error) {
    console.error("Error setting default payment method:", error)
    return { success: false, error: "Failed to set default payment method" }
  }
}

export async function getActivePaymentMethods() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const paymentMethods = await PaymentMethod.find({
      userId: session.user.id,
    })
      .select("_id cardName cardNumber expiryMonth expiryYear cardHolderName isDefault")
      .lean()

    // Serialize the payment methods to plain objects and mask card numbers
    const serializedPaymentMethods = paymentMethods.map((pm) => ({
      ...pm,
      _id: (pm._id as any).toString(),
      cardNumber: `****-****-****-${pm.cardNumber.slice(-4)}`, // Mask card number for security
    }))

    return { success: true, paymentMethods: serializedPaymentMethods }
  } catch (error) {
    console.error("Error fetching active payment methods:", error)
    return { success: false, error: "Failed to fetch payment methods" }
  }
}
