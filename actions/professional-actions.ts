"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile, { type ProfessionalStatus } from "@/lib/db/models/professional-profile"
import User from "@/lib/db/models/user"
import bcrypt from "bcryptjs"

export async function getProfessionals(page = 1, limit = 10, searchTerm?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, professionals: [], totalPages: 0 }
    }
    await dbConnect()
    const query: any = { roles: "professional" }
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
      ]
    }
    const skip = (page - 1) * limit
    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).select("name email phone roles activeRole").lean(),
      User.countDocuments(query),
    ])
    const profiles = await ProfessionalProfile.find({ userId: { $in: users.map((u) => u._id) } }).lean()
    const profMap = new Map(profiles.map((p) => [p.userId.toString(), p]))
    const professionals = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      activeRole: u.activeRole,
      professionalNumber: profMap.get(u._id.toString())?.professionalNumber || "",
      status: profMap.get(u._id.toString())?.status || "pending",
    }))
    return { success: true, professionals, totalPages: Math.ceil(total / limit) }
  } catch (err) {
    console.error("Error in getProfessionals:", err)
    return { success: false, professionals: [], totalPages: 0 }
  }
}

function generateNumber() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

async function getUniqueProfessionalNumber() {
  let num = generateNumber()
  let exists = await ProfessionalProfile.findOne({ professionalNumber: num }).lean()
  while (exists) {
    num = generateNumber()
    exists = await ProfessionalProfile.findOne({ professionalNumber: num }).lean()
  }
  return num
}

export async function createProfessional(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }
    await dbConnect()
    const userId = formData.get("userId") as string | null
    const name = formData.get("name") as string | null
    const email = formData.get("email") as string | null
    const phone = formData.get("phone") as string | null
    const password = formData.get("password") as string | null
    let user
    if (userId) {
      user = await User.findById(userId)
      if (!user) return { success: false, message: "userNotFound" }
    } else {
      if (!name || !email || !phone || !password) {
        return { success: false, message: "missingFields" }
      }
      const hashed = await bcrypt.hash(password, 10)
      user = new User({
        name,
        email: email.toLowerCase(),
        phone,
        password: hashed,
        roles: ["professional"],
        activeRole: "professional",
        emailVerified: new Date(),
        phoneVerified: new Date(),
      })
      await user.save()
    }
    if (!user.roles.includes("professional")) {
      user.roles.push("professional")
    }
    user.activeRole = "professional"
    await user.save()
    const profNumber = await getUniqueProfessionalNumber()
    const profile = new ProfessionalProfile({
      userId: user._id,
      professionalNumber: profNumber,
      status: "pending" as ProfessionalStatus,
    })
    await profile.save()
    return { success: true, professionalId: user._id.toString() }
  } catch (err) {
    console.error("Error in createProfessional:", err)
    return { success: false, message: "creationFailed" }
  }
}

export async function getProfessionalById(professionalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }
    await dbConnect()
    const user = await User.findById(professionalId).lean()
    if (!user || !user.roles.includes("professional")) {
      return { success: false, message: "notFound" }
    }
    const profile = await ProfessionalProfile.findOne({ userId: user._id }).lean()
    return {
      success: true,
      professional: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        professionalNumber: profile?.professionalNumber || "",
        status: (profile?.status as ProfessionalStatus) || "pending",
      },
    }
  } catch (err) {
    console.error("Error in getProfessionalById:", err)
    return { success: false, message: "fetchFailed" }
  }
}

export async function updateProfessionalStatus(professionalId: string, status: ProfessionalStatus) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }
    await dbConnect()
    const profile = await ProfessionalProfile.findOne({ userId: professionalId })
    if (!profile) {
      return { success: false, message: "notFound" }
    }
    profile.status = status
    await profile.save()
    return { success: true }
  } catch (err) {
    console.error("Error in updateProfessionalStatus:", err)
    return { success: false, message: "updateFailed" }
  }
}

