"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface BookingsErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface BookingsErrorBoundaryProps {
  children: React.ReactNode
}

export class BookingsErrorBoundary extends React.Component<
  BookingsErrorBoundaryProps,
  BookingsErrorBoundaryState
> {
  constructor(props: BookingsErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): BookingsErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BookingsErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              שגיאה בטעינת ההזמנות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              אירעה שגיאה בטעינת נתוני ההזמנות. אנא נסה שוב.
            </p>
            {this.state.error && (
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer">פרטים טכניים</summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
} 