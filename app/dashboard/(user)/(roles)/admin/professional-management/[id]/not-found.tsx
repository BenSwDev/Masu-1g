import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ArrowLeft } from "lucide-react"

export default function ProfessionalNotFound() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/professional-management">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            חזור לרשימה
          </Button>
        </Link>
        
        <h1 className="text-2xl font-bold">מטפל לא נמצא</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            המטפל המבוקש לא נמצא
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            המטפל שאתה מחפש לא קיים במערכת או שהמזהה שלו אינו תקין.
          </p>
          
          <div className="flex gap-3">
            <Link href="/dashboard/admin/professional-management">
              <Button>
                חזור לרשימת המטפלים
              </Button>
            </Link>
            
            <Link href="/dashboard/admin/professional-management/new">
              <Button variant="outline">
                צור מטפל חדש
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 