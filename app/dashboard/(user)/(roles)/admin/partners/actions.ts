"use server"

import dbConnect from "@/lib/db/mongoose"
import PartnerProfile, { type IPartnerProfile } from "@/lib/db/models/partner-profile"
import type { IUser } from "@/lib/db/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { Types } from "mongoose"

interface GetPartnersOptions {
  page?: number
  limit?: number
  search?: string
}

interface GetPartnersResult {
  success: boolean
  data?: {
    partners: (IPartnerProfile & { userId: IUser })[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }
  error?: string
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.roles?.includes("admin")) {
    throw new Error("Unauthorized")
  }
}

export async function getPartners(options: GetPartnersOptions = {}): Promise<GetPartnersResult> {
  try {
    await requireAdmin()
    await dbConnect()

    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 50) : 10
    const search = options.search?.trim() || ""

    const pipeline: any[] = [
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userId" } },
      { $unwind: "$userId" },
      { $match: { "userId.roles": "partner" } }
    ]

    if (search) {
      const regex = { $regex: search, $options: "i" }
      pipeline.push({
        $match: {
          $or: [
            { "userId.name": regex },
            { "userId.email": regex },
            { "userId.phone": regex },
            { businessNumber: regex },
            { contactName: regex }
          ]
        }
      })
    }

    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await PartnerProfile.aggregate(countPipeline)
    const total = countResult[0]?.total || 0
    const pages = Math.ceil(total / limit)

    pipeline.push({ $sort: { createdAt: -1 } })
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit })

    const partners = await PartnerProfile.aggregate(pipeline)

    return {
      success: true,
      data: {
        partners: partners as any,
        pagination: { page, limit, total, pages }
      }
    }
  } catch (error) {
    console.error("Error getPartners", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function getPartnerById(id: string): Promise<{ success: boolean; partner?: IPartnerProfile & { userId: IUser }; error?: string }> {
  try {
    await requireAdmin()

    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid ID" }
    }

    await dbConnect()

    const partner = await PartnerProfile.findById(id)
      .populate("userId", "name email phone roles")
      .lean()

    if (!partner) {
      return { success: false, error: "Partner not found" }
    }

    const user = partner.userId as IUser
    if (!user.roles?.includes("partner")) {
      return { success: false, error: "User is not a partner" }
    }

    return { success: true, partner: partner as any }
  } catch (error) {
    console.error("Error getPartnerById", error)
    return { success: false, error: (error as Error).message }
  }
}
