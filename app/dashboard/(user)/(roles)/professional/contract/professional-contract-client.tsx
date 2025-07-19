"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { 
  ScrollText, 
  Clock, 
  Info, 
  FileText,
  Calendar,
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink
} from "lucide-react"

interface ProfessionalContractClientProps {
  professional: {
    _id: string
    userId: string
    status: string
    isActive: boolean
    appliedAt?: Date
  }
}

export default function ProfessionalContractClient({ professional }: ProfessionalContractClientProps) {
  const { t, dir } = useTranslation()

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "לא זמין"
    const d = new Date(date)
    return d.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          מושהה
        </Badge>
      )
    }
    
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3" />
            פעיל
          </Badge>
        )
      case 'pending_admin_approval':
        return (
          <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800">
            <Clock className="w-3 h-3" />
            ממתין לאישור
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              סטטוס הפרופיל
            </CardTitle>
            {getStatusBadge(professional.status, professional.isActive)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">תאריך הצטרפות:</span>
              <span className="font-medium">{formatDate(professional.appliedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">מזהה פרופיל:</span>
              <span className="font-medium font-mono text-xs">{professional._id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development Status Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="flex items-center justify-between">
            <span className="font-medium">מערכת ההסכמים נמצאת בפיתוח</span>
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              בקרוב
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Main Contract Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-600" />
            הסכם מטפל
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-muted-foreground">מערכת הסכמים דיגיטליים</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                מערכת ניהול הסכמי המטפלים נמצאת כרגע בפיתוח ותהיה זמינה בקרוב
              </p>
            </div>
            
            {/* Temporary Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="outline" className="gap-2" disabled>
                <Download className="w-4 h-4" />
                הורד הסכם נוכחי
              </Button>
              <Button variant="outline" className="gap-2" disabled>
                <ExternalLink className="w-4 h-4" />
                פנה לתמיכה
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Features */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-600" />
            תכונות עתידיות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">הסכמים אוטומטיים</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">חתימה דיגיטלית</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm">ניהול תנאי עבודה</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm">מעקב תוקף הסכמים</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm">חלוקת רווחים</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-sm">דרישות שירות (SLA)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Terms Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            תנאים נוכחיים (כללי)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">תשלומים</h4>
              <ul className="space-y-1 text-green-700 text-xs">
                <li>• תשלום לפי הטיפולים שמסופקים</li>
                <li>• תשלום חודשי עד יום 15 לחודש</li>
                <li>• ניכויים בהתאם לחוק</li>
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">זמינות ושירות</h4>
              <ul className="space-y-1 text-blue-700 text-xs">
                <li>• זמינות בהתאם לאזורי הפעילות שנבחרו</li>
                <li>• מענה לבקשות תוך 24 שעות</li>
                <li>• שמירה על איכות שירות גבוהה</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-800 mb-2">חובות ואחריות</h4>
              <ul className="space-y-1 text-purple-700 text-xs">
                <li>• ביטוח אחריות מקצועית תקף</li>
                <li>• עמידה בתקנים מקצועיים</li>
                <li>• שמירה על סודיות לקוחות</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">צריך עזרה עם ההסכם?</p>
              <p className="text-xs mb-3">
                לשאלות על תנאי העבודה, תשלומים או ההסכם - צור קשר עם הצוות שלנו
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                  <Mail className="w-3 h-3 mr-1" />
                  שלח אימייל
                </Button>
                <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                  <Phone className="w-3 h-3 mr-1" />
                  התקשר אלינו
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 