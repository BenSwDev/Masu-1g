import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile from "@/lib/db/models/professional-profile"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file || !type) {
      return NextResponse.json({ 
        success: false, 
        error: "חסרים פרטי הקובץ או סוג המסמך" 
      }, { status: 400 })
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: "נא להעלות קבצים מסוג PDF, JPG או PNG בלבד" 
      }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      return NextResponse.json({ 
        success: false, 
        error: "גודל הקובץ לא יכול לעלות על 10MB" 
      }, { status: 400 })
    }

    // For now, we'll create a placeholder URL
    // In production, you would upload to cloud storage (AWS S3, Cloudinary, etc.)
    const documentUrl = `/uploads/documents/${session.user.id}/${type}/${Date.now()}-${file.name}`
    
    // Connect to database
    await dbConnect()

    // Update professional profile with new document
    const updatedProfile = await ProfessionalProfile.findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          [`documents`]: {
            $cond: {
              if: { $isArray: "$documents" },
              then: {
                $concatArrays: [
                  {
                    $filter: {
                      input: "$documents",
                      cond: { $ne: ["$$this.type", type] }
                    }
                  },
                  [{
                    type: type,
                    name: file.name,
                    url: documentUrl,
                    status: "pending",
                    uploadedAt: new Date(),
                    originalName: file.name,
                    size: file.size,
                    mimeType: file.type
                  }]
                ]
              },
              else: [{
                type: type,
                name: file.name,
                url: documentUrl,
                status: "pending",
                uploadedAt: new Date(),
                originalName: file.name,
                size: file.size,
                mimeType: file.type
              }]
            }
          }
        }
      },
      { new: true, upsert: false }
    )

    // Since we can't use aggregation pipeline in findOneAndUpdate easily,
    // let's do it in two steps
    const profile = await ProfessionalProfile.findOne({ userId: session.user.id })
    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        error: "פרופיל מטפל לא נמצא" 
      }, { status: 404 })
    }

    // Remove existing document of the same type and add new one
    const existingDocuments = profile.documents || []
    const filteredDocuments = existingDocuments.filter(doc => doc.type !== type)
    
    const newDocument = {
      type: type,
      name: file.name,
      url: documentUrl,
      status: "pending",
      uploadedAt: new Date(),
      originalName: file.name,
      size: file.size,
      mimeType: file.type
    }

    const updatedDocuments = [...filteredDocuments, newDocument]

    await ProfessionalProfile.findOneAndUpdate(
      { userId: session.user.id },
      { $set: { documents: updatedDocuments } },
      { new: true }
    )

    return NextResponse.json({ 
      success: true, 
      message: "המסמך הועלה בהצלחה וממתין לאישור",
      document: newDocument
    })

  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json({ 
      success: false, 
      error: "שגיאה בהעלאת המסמך" 
    }, { status: 500 })
  }
} 