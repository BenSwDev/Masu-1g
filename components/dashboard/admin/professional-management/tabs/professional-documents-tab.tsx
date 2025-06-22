"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { FileText, Upload, Download, Eye, Trash2, AlertTriangle, Check, Clock } from "lucide-react"
import type { Professional } from "@/lib/types/professional"

interface ProfessionalDocumentsTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
}

const requiredDocuments = [
  { type: "insurance", name: "ביטוח אחריות מקצועית", required: true },
  { type: "diploma", name: "תעודת הכשרה/דיפלומה", required: true }
]

export default function ProfessionalDocumentsTab({
  professional,
  onUpdate
}: ProfessionalDocumentsTabProps) {
  const { t, dir } = useTranslation()
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
    setUploading(docType)
    
    try {
      // Here you would typically upload the file to your storage service
      // For now, we'll simulate the upload process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newDoc = {
        id: Date.now().toString(),
        type: docType,
        name: file.name,
        status: "pending" as const,
        uploadDate: new Date(),
        fileUrl: URL.createObjectURL(file) // This would be the actual URL from your storage
      }

      const updatedDocuments = [...documents.filter(d => d.type !== docType), newDoc]
      onUpdate({ documents: updatedDocuments })
      
    } catch (error) {
      console.error("Error uploading document:", error)
    } finally {
      setUploading(null)
    }
  }

  const handleDocumentAction = (docId: string, action: "approve" | "reject", reason?: string) => {
    const updatedDocuments = documents.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: action === "approve" ? "approved" as const : "rejected" as const,
          ...(action === "approve" ? { approvedDate: new Date() } : { rejectedDate: new Date(), rejectionReason: reason })
        }
      }
      return doc
    })
    
    onUpdate({ documents: updatedDocuments })
  }

  const handleDeleteDocument = (docId: string) => {
    const updatedDocuments = documents.filter(d => d.id !== docId)
    onUpdate({ documents: updatedDocuments })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("he-IL")
  }

  const getDocumentStats = () => {
    const requiredDocs = requiredDocuments.filter(d => d.required)
    const approvedRequired = requiredDocs.filter(d => getDocumentStatus(d.type) === "approved").length
    const totalRequired = requiredDocs.length
    
    return { approvedRequired, totalRequired }
  }

  const stats = getDocumentStats()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            מסמכי המטפל
          </h3>
          <p className="text-sm text-muted-foreground">
            ניהול מסמכים נדרשים לאישור המטפל
          </p>
        </div>
        <div className="text-sm">
          <Badge variant={stats.approvedRequired === stats.totalRequired ? "default" : "secondary"}>
            {stats.approvedRequired}/{stats.totalRequired} מסמכים נדרשים אושרו
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>סטטוס מסמכים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {documents.filter(d => d.status === "approved").length}
              </div>
              <div className="text-sm text-green-600">אושרו</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {documents.filter(d => d.status === "pending").length}
              </div>
              <div className="text-sm text-yellow-600">ממתינים</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {documents.filter(d => d.status === "rejected").length}
              </div>
              <div className="text-sm text-red-600">נדחו</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {requiredDocuments.filter(rd => !documents.find(d => d.type === rd.type)).length}
              </div>
              <div className="text-sm text-gray-600">חסרים</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {requiredDocuments.map(reqDoc => {
          const doc = getDocumentByType(reqDoc.type)
          const status = getDocumentStatus(reqDoc.type)
          
          return (
            <Card key={reqDoc.type} className={`${reqDoc.required && status === "missing" ? "border-red-200 bg-red-50/30" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {reqDoc.name}
                        {reqDoc.required && <span className="text-red-500 text-xs">*נדרש</span>}
                      </div>
                      {doc && (
                        <div className="text-sm text-muted-foreground">
                          הועלה ב-{formatDate(doc.uploadDate)}
                          {doc.approvedDate && ` • אושר ב-${formatDate(doc.approvedDate)}`}
                          {doc.rejectedDate && ` • נדחה ב-${formatDate(doc.rejectedDate)}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(status)}
                    
                    {doc ? (
                      <div className="flex items-center gap-1">
                        {doc.fileUrl && (
                          <>
                            <Button variant="outline" size="sm" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={doc.fileUrl} download={doc.name}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                        
                        {doc.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDocumentAction(doc.id, "approve")}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDocumentAction(doc.id, "reject", "לא עומד בדרישות")}
                              className="text-red-600 hover:text-red-700"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          id={`upload-${reqDoc.type}`}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileUpload(reqDoc.type, file)
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          disabled={uploading === reqDoc.type}
                        >
                          <label htmlFor={`upload-${reqDoc.type}`} className="cursor-pointer">
                            {uploading === reqDoc.type ? (
                              <>
                                <Clock className="h-4 w-4 animate-spin mr-2" />
                                מעלה...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                העלה
                              </>
                            )}
                          </label>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {doc?.status === "rejected" && doc.rejectionReason && (
                  <Alert className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      סיבת דחייה: {doc.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>הנחיות להעלאת מסמכים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• פורמטים נתמכים: PDF, JPG, PNG, DOC, DOCX</p>
            <p>• גודל קובץ מקסימלי: 10MB</p>
            <p>• המסמכים חייבים להיות ברורים וקריאים</p>
            <p>• מסמכים בעברית או אנגלית בלבד</p>
            <p>• כל המסמכים הנדרשים (*) חייבים להיות מאושרים לפני הפעלת המטפל</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 