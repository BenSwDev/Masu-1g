"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import { Types } from "mongoose"

export interface FinancialDetail {
  bookingId: string
  treatmentName: string
  date: Date
  amount: number
}

export interface FinancialRecord {
  period: string
  treatments: number
  earnings: number
  adjustments: number
  total: number
  details: FinancialDetail[]
}

function getPeriodKey(date: Date, period: "day" | "week" | "month") {
  if (period === "day") {
    return date.toISOString().slice(0, 10)
  }
  if (period === "week") {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(d.setUTCDate(diff))
    weekStart.setUTCHours(0, 0, 0, 0)
    return weekStart.toISOString().slice(0, 10)
  }
  return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}`
}

export async function getProfessionalFinancialSummary(
  period: "day" | "week" | "month" = "day",
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()
    const professionalId = new Types.ObjectId(session.user.id)

    const bookings = await Booking.find({
      professionalId,
      status: "completed",
    })
      .select("bookingDateTime staticTherapistPay staticTherapistPayExtra treatmentId")
      .populate("treatmentId", "name")
      .lean()

    const profile = await ProfessionalProfile.findOne(
      { userId: professionalId },
      { financialTransactions: 1 },
    ).lean()

    const records: Record<string, FinancialRecord> = {}

    for (const b of bookings) {
      const key = getPeriodKey(new Date(b.bookingDateTime), period)
      if (!records[key]) {
        records[key] = {
          period: key,
          treatments: 0,
          earnings: 0,
          adjustments: 0,
          total: 0,
          details: [],
        }
      }
      const amount = (b.staticTherapistPay || 0) + (b.staticTherapistPayExtra || 0)
      records[key].treatments += 1
      records[key].earnings += amount
      records[key].details.push({
        bookingId: b._id.toString(),
        treatmentName: (b.treatmentId as any)?.name || "",
        date: b.bookingDateTime,
        amount,
      })
    }

    profile?.financialTransactions?.forEach((t: any) => {
      const key = getPeriodKey(new Date(t.date), period)
      if (!records[key]) {
        records[key] = {
          period: key,
          treatments: 0,
          earnings: 0,
          adjustments: 0,
          total: 0,
          details: [],
        }
      }
      const val = t.type === "penalty" ? -t.amount : t.amount
      records[key].adjustments += val
    })

    const summary = Object.values(records).map((r) => ({
      ...r,
      total: r.earnings + r.adjustments,
    }))

    summary.sort((a, b) => b.period.localeCompare(a.period))

    return { success: true, data: summary }
  } catch (error) {
    console.error("Financial summary error", error)
    return { success: false, error: "Failed to fetch summary" }
  }
}

export async function addProfessionalTransaction(
  professionalUserId: string,
  type: "bonus" | "penalty" | "adjustment",
  amount: number,
  description: string,
  adminNote?: string,
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles.includes("admin")) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await dbConnect()
    const profile = await ProfessionalProfile.findOne({ userId: professionalUserId })
    if (!profile) {
      return { success: false, error: "Professional not found" }
    }

    await profile.addFinancialTransaction({
      type,
      amount,
      description,
      adminUserId: new Types.ObjectId(session.user.id),
      adminNote,
    })

    return { success: true }
  } catch (error) {
    console.error("Add transaction error", error)
    return { success: false, error: "Failed to add transaction" }
  }
}
