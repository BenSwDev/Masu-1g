"use server"

import dbConnect from "@/lib/db/mongoose"
import PartnerProfile, { type IPartnerProfile } from "@/lib/db/models/partner-profile"
import type { IUser } from "@/lib/db/models/user"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { Types } from "mongoose"
import { revalidatePath } from "next/cache"
import {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
} from "@/actions/admin-actions"

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

export async function createPartner(formData: FormData) {
  try {
    await requireAdmin()

    const userForm = new FormData()
    userForm.append("name", String(formData.get("name") || ""))
    userForm.append("email", String(formData.get("email") || ""))
    userForm.append("phone", String(formData.get("phone") || ""))
    userForm.append("gender", String(formData.get("gender") || "male"))
    if (formData.get("password")) userForm.append("password", String(formData.get("password")))
    userForm.append("roles[]", "partner")

    const userRes = await createUserByAdmin(userForm)
    if (!userRes.success || !userRes.user) {
      return { success: false, error: userRes.message || "Failed to create user" }
    }

    await dbConnect()
    const profile = await PartnerProfile.create({
      userId: userRes.user.id,
      businessNumber: formData.get("businessNumber"),
      contactName: formData.get("contactName"),
    })

    const partner = await PartnerProfile.findById(profile._id)
      .populate("userId", "name email phone roles gender")
      .lean()

    revalidatePath("/dashboard/admin/partners")
    return { success: true, partner: partner as any }
  } catch (error) {
    console.error("Error createPartner", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function updatePartner(id: string, formData: FormData) {
  try {
    await requireAdmin()

    if (!id || !Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid ID" }
    }

    await dbConnect()
    const existing = await PartnerProfile.findById(id)
    if (!existing) return { success: false, error: "Partner not found" }

    const userForm = new FormData()
    userForm.append("name", String(formData.get("name") || ""))
    userForm.append("email", String(formData.get("email") || ""))
    userForm.append("phone", String(formData.get("phone") || ""))
    userForm.append("gender", String(formData.get("gender") || "male"))
    userForm.append("roles[]", "partner")

    const res = await updateUserByAdmin(String(existing.userId), userForm)
    if (!res.success) return { success: false, error: res.message }

    existing.businessNumber = String(formData.get("businessNumber") || "")
    existing.contactName = String(formData.get("contactName") || "")
    await existing.save()

    const partner = await PartnerProfile.findById(id)
      .populate("userId", "name email phone roles gender")
      .lean()

    revalidatePath("/dashboard/admin/partners")
    return { success: true, partner: partner as any }
  } catch (error) {
    console.error("Error updatePartner", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function removePartner(id: string) {
  try {
    await requireAdmin()

    if (!id || !Types.ObjectId.isValid(id)) return { success: false, error: "Invalid ID" }

    await dbConnect()
    const existing = await PartnerProfile.findById(id)
    if (!existing) return { success: false, error: "Partner not found" }

    await PartnerProfile.findByIdAndDelete(id)
    await deleteUserByAdmin(String(existing.userId))

    revalidatePath("/dashboard/admin/partners")
    return { success: true }
  } catch (error) {
    console.error("Error removePartner", error)
    return { success: false, error: (error as Error).message }
  }
}