"use server"

import dbConnect from "@/lib/db/mongoose"
import Bundle, { type IBundle } from "@/lib/db/models/bundle"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"

// Get all bundles
export async function getBundles() {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    // Check if user is logged in
    if (!session) {
      return { success: false, error: "Unauthorized", bundles: [] }
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.includes("admin")
    if (!isAdmin) {
      return { success: false, error: "Unauthorized", bundles: [] }
    }

    const bundles = await Bundle.find({}).sort({ createdAt: -1 }).lean()
    return { success: true, bundles: JSON.parse(JSON.stringify(bundles)) }
  } catch (error) {
    console.error("Error fetching bundles:", error)
    return { success: false, error: "Failed to fetch bundles", bundles: [] }
  }
}

// Get bundle by ID
export async function getBundleById(id: string) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    // Check if user is logged in
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.includes("admin")
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    const bundle = await Bundle.findById(id).lean()
    if (!bundle) {
      return { success: false, error: "Bundle not found" }
    }
    return { success: true, bundle: JSON.parse(JSON.stringify(bundle)) }
  } catch (error) {
    console.error("Error fetching bundle:", error)
    return { success: false, error: "Failed to fetch bundle" }
  }
}

// Create a new bundle
export async function createBundle(bundleData: Partial<IBundle>) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    // Check if user is logged in
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.includes("admin")
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    const newBundle = new Bundle(bundleData)
    await newBundle.save()

    return { success: true, bundle: JSON.parse(JSON.stringify(newBundle.toObject())) }
  } catch (error) {
    console.error("Error creating bundle:", error)
    return { success: false, error: "Failed to create bundle" }
  }
}

// Update a bundle
export async function updateBundle(id: string, bundleData: Partial<IBundle>) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    // Check if user is logged in
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.includes("admin")
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    const updatedBundle = await Bundle.findByIdAndUpdate(id, { $set: bundleData }, { new: true, lean: true })

    if (!updatedBundle) {
      return { success: false, error: "Bundle not found" }
    }

    return { success: true, bundle: JSON.parse(JSON.stringify(updatedBundle)) }
  } catch (error) {
    console.error("Error updating bundle:", error)
    return { success: false, error: "Failed to update bundle" }
  }
}

// Delete a bundle
export async function deleteBundle(id: string) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    // Check if user is logged in
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.includes("admin")
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    const deletedBundle = await Bundle.findByIdAndDelete(id)

    if (!deletedBundle) {
      return { success: false, error: "Bundle not found" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting bundle:", error)
    return { success: false, error: "Failed to delete bundle" }
  }
}

// Duplicate a bundle
export async function duplicateBundle(id: string) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    // Check if user is logged in
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.includes("admin")
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    const bundle = await Bundle.findById(id).lean()

    if (!bundle) {
      return { success: false, error: "Bundle not found" }
    }

    const bundleObject = { ...bundle }
    delete bundleObject._id
    bundleObject.name = `${bundleObject.name} (עותק)`

    const newBundle = new Bundle(bundleObject)
    await newBundle.save()

    return { success: true, bundle: JSON.parse(JSON.stringify(newBundle.toObject())) }
  } catch (error) {
    console.error("Error duplicating bundle:", error)
    return { success: false, error: "Failed to duplicate bundle" }
  }
}

// Toggle bundle active status
export async function toggleBundleStatus(id: string) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    // Check if user is logged in
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // Check if user has admin role
    const isAdmin = session.user.roles?.includes("admin")
    if (!isAdmin) {
      return { success: false, error: "Unauthorized" }
    }

    const bundle = await Bundle.findById(id)

    if (!bundle) {
      return { success: false, error: "Bundle not found" }
    }

    bundle.isActive = !bundle.isActive
    await bundle.save()

    return { success: true, bundle: JSON.parse(JSON.stringify(bundle.toObject())) }
  } catch (error) {
    console.error("Error toggling bundle status:", error)
    return { success: false, error: "Failed to toggle bundle status" }
  }
}
