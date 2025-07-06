"use client"

import { Component, ErrorInfo, ReactNode } from "react"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export class ProfessionalEditErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error without console.error during render
    setTimeout(() => {
      console.error('ProfessionalEditErrorBoundary error details:', error, errorInfo)
    }, 0)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto py-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-lg font-semibold">שגיאה בטעינת עמוד עריכת המטפל</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                אירעה שגיאה בטעינת עמוד עריכת המטפל. זה יכול להיות בגלל בעיה בנתונים או infinite loop.
              </p>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm font-mono text-red-800">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  רענן דף
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  חזור אחורה
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
} 