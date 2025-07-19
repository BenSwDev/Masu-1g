"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useToast } from "@/components/common/ui/use-toast"
import { FileText, Upload, Download, Eye, Trash2, AlertTriangle, Check, Clock } from "lucide-react"

interface ProfessionalDocumentsClientProps {
  professional: {
    _id: string
    userId: string
    documents?: Array<{
      type: string
      name: string
      url: string
      status: "pending" | "approved" | "rejected" | "missing"
      uploadedAt: Date
      rejectionReason?: string
    }>
    status: string
    isActive: boolean
  }
}

const requiredDocuments = [
  { type: "insurance", name: "ביטוח אחריות מקצועית", required: true },
  { type: "diploma", name: "תעודת הכשרה/דיפלומה", required: true },
  { type: "license", name: "רישיון עסוק (אם נדרש)", required: false },
  { type: "certificate", name: "תעודות נוספות", required: false }
]

export default function ProfessionalDocumentsClient({ professional }: ProfessionalDocumentsClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [uploading, setUploading] = useState<string | null>(null)

  const documents = professional.documents || []

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.type === docType)
    return doc?.status || "missing"
  }

  const getDocumentByType = (docType: string) => {
    return documents.find(d => d.type === docType)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Check className="h-3 w-3 mr-1" />
            אושר
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            ממתין לאישור
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            נדחה
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-red-600 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            חסר
          </Badge>
        )
    }
  }

  const handleFileUpload = async (docType: string, file: File) => {
    if (!file) return

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא להעלות קבצים מסוג PDF, JPG או PNG בלבד"
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "גודל הקובץ לא יכול לעלות על 10MB"
      })
      return
    }

    setUploading(docType)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', docType)

      const response = await fetch('/api/professional/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "הצלחה",
          description: "המסמך הועלה בהצלחה וממתין לאישור"
        })
        // Refresh the page or update the state
        window.location.reload()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בהעלאת המסמך"
        })
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בהעלאת המסמך"
      })
    } finally {
      setUploading(null)
    }
  }

  const handleDeleteDocument = async (docType: string) => {
    try {
      const response = await fetch(`/api/professional/documents/${docType}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "הצלחה",
          description: "המסמך נמחק בהצלחה"
        })
        // Refresh the page or update the state
        window.location.reload()
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה במחיקת המסמך"
        })
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה במחיקת המסמך"
      })
    }
  }

  const approvedCount = documents.filter(doc => doc.status === "approved").length
  const totalRequired = requiredDocuments.filter(doc => doc.required).length

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            סטטוס מסמכים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-sm text-muted-foreground">מסמכים אושרו</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{totalRequired}</div>
              <div className="text-sm text-muted-foreground">מסמכים נדרשים</div>
            </div>
          </div>
          
          {approvedCount < totalRequired && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                נדרש להעלות ולאשר את כל המסמכים הנדרשים כדי להפעיל את הפרופיל במלואו
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="grid gap-4">
        {requiredDocuments.map((reqDoc) => {
          const document = getDocumentByType(reqDoc.type)
          const status = getDocumentStatus(reqDoc.type)

          return (
            <Card key={reqDoc.type}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{reqDoc.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(status)}
                        {reqDoc.required && (
                          <Badge variant="outline" className="text-xs">
                            נדרש
                          </Badge>
                        )}
                      </div>
                      {document?.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">
                          סיבת דחייה: {document.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {document?.url && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <a href={document.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1" />
                            צפייה
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={document.url} download>
                            <Download className="h-4 w-4 mr-1" />
                            הורדה
                          </a>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteDocument(reqDoc.type)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          מחיקה
                        </Button>
                      </>
                    )}
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(reqDoc.type, file)
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading === reqDoc.type}
                      />
                      <Button size="sm" disabled={uploading === reqDoc.type}>
                        {uploading === reqDoc.type ? (
                          <>
                            <Clock className="h-4 w-4 mr-1 animate-spin" />
                            מעלה...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1" />
                            {document ? 'החלף' : 'העלה'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Guidelines */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-3">הנחיות להעלאת מסמכים</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• העלה קבצים בפורמט PDF, JPG או PNG בלבד</li>
            <li>• גודל מקסימלי לקובץ: 10MB</li>
            <li>• וודא שהמסמכים ברורים וקריאים</li>
            <li>• המסמכים יועברו לאישור צוות המנהל</li>
            <li>• במקרה של דחייה, תוכל להעלות מסמך מעודכן</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 