import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile from "@/lib/db/models/professional-profile"

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { bankName, branchNumber, accountNumber } = body

    // Validate required fields
    if (!bankName || !branchNumber || !accountNumber) {
      return NextResponse.json({ 
        success: false, 
        error: "נא למלא את כל שדות חשבון הבנק" 
      }, { status: 400 })
    }

    // Connect to database
    await dbConnect()

    // Find and update professional profile
    const updatedProfile = await ProfessionalProfile.findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          bankDetails: {
            bankName: bankName.trim(),
            branchNumber: branchNumber.trim(),
            accountNumber: accountNumber.trim(),
            updatedAt: new Date()
          }
        }
      },
      { new: true, upsert: false }
    )

    if (!updatedProfile) {
      return NextResponse.json({ 
        success: false, 
        error: "פרופיל מטפל לא נמצא" 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "פרטי חשבון הבנק עודכנו בהצלחה",
      bankDetails: updatedProfile.bankDetails
    })

  } catch (error) {
    console.error("Error updating bank details:", error)
    return NextResponse.json({ 
      success: false, 
      error: "שגיאה בעדכון פרטי חשבון הבנק" 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    // Connect to database
    await dbConnect()

    // Find professional profile
    const profile = await ProfessionalProfile.findOne({ 
      userId: session.user.id 
    }).select('bankDetails').lean()

    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        error: "פרופיל מטפל לא נמצא" 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      bankDetails: profile.bankDetails || {}
    })

  } catch (error) {
    console.error("Error fetching bank details:", error)
    return NextResponse.json({ 
      success: false, 
      error: "שגיאה בטעינת פרטי חשבון הבנק" 
    }, { status: 500 })
  }
} 