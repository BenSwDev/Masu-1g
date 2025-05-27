"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { PaymentMethod, type IPaymentMethod } from "@/lib/db/models/payment-method"
import dbConnect from "@/lib/db/mongoose"
import { revalidatePath } from "next/cache"

export interface PaymentMethodFormData {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardHolderName: string
  cardName?: string
  isDefault?: boolean
}

export async function getPaymentMethods(): Promise<IPaymentMethod[]> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const paymentMethods = await PaymentMethod.find({
      userId: session.user.id,
    })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()

    return JSON.parse(JSON.stringify(paymentMethods))
  } catch (error) {
    console.error("Error fetching payment methods:", error)
    throw new Error("Failed to fetch payment methods")
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
      await PaymentMethod.updateMany({ userId: session.user.id }, { $set: { isDefault: false } })
    }

    // Generate card name if not provided
    let cardName = data.cardName
    if (!cardName) {
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

    revalidatePath("/dashboard/member/payment-methods")
    revalidatePath("/dashboard")

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
      await PaymentMethod.updateMany({ userId: session.user.id, _id: { $ne: id } }, { $set: { isDefault: false } })
    }

    const paymentMethod = await PaymentMethod.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: data },
      { new: true },
    )

    if (!paymentMethod) {
      throw new Error("Payment method not found")
    }

    revalidatePath("/dashboard/member/payment-methods")
    revalidatePath("/dashboard")

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

    revalidatePath("/dashboard/member/payment-methods")
    revalidatePath("/dashboard")

    return { success: true }
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

    // First, unset all defaults for this user
    await PaymentMethod.updateMany({ userId: session.user.id }, { $set: { isDefault: false } })

    // Then set the selected one as default
    const paymentMethod = await PaymentMethod.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { isDefault: true } },
      { new: true },
    )

    if (!paymentMethod) {
      throw new Error("Payment method not found")
    }

    revalidatePath("/dashboard/member/payment-methods")
    revalidatePath("/dashboard")

    return { success: true, paymentMethod: JSON.parse(JSON.stringify(paymentMethod)) }
  } catch (error) {
    console.error("Error setting default payment method:", error)
    return { success: false, error: "Failed to set default payment method" }
  }
}
