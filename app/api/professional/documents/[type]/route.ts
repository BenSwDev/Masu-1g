import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile from "@/lib/db/models/professional-profile"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    const { type } = params

    if (!type) {
      return NextResponse.json({ 
        success: false, 
        error: "סוג המסמך נדרש" 
      }, { status: 400 })
    }

    // Connect to database
    await dbConnect()

    // Find the professional profile
    const profile = await ProfessionalProfile.findOne({ userId: session.user.id })
    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        error: "פרופיל מטפל לא נמצא" 
      }, { status: 404 })
    }

    // Remove the document of the specified type
    const existingDocuments = profile.documents || []
    const filteredDocuments = existingDocuments.filter(doc => doc.type !== type)

    // Update the profile
    await ProfessionalProfile.findOneAndUpdate(
      { userId: session.user.id },
      { $set: { documents: filteredDocuments } },
      { new: true }
    )

    return NextResponse.json({ 
      success: true, 
      message: "המסמך נמחק בהצלחה"
    })

  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ 
      success: false, 
      error: "שגיאה במחיקת המסמך" 
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    const { type } = params

    // Connect to database
    await dbConnect()

    // Find the professional profile and the specific document
    const profile = await ProfessionalProfile.findOne({ 
      userId: session.user.id 
    }).select('documents').lean()

    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        error: "פרופיל מטפל לא נמצא" 
      }, { status: 404 })
    }

    const document = profile.documents?.find(doc => doc.type === type)

    if (!document) {
      return NextResponse.json({ 
        success: false, 
        error: "מסמך לא נמצא" 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      document
    })

  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json({ 
      success: false, 
      error: "שגיאה בטעינת המסמך" 
    }, { status: 500 })
  }
} 