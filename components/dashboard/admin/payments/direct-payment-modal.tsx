"use client"

import { useState } from "react"
import { Button } from "@/components/common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/common/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { CreditCard, DollarSign, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { logger } from "@/lib/logs/logger"

const directPaymentSchema = z.object({
  action: z.enum(["charge", "refund"], {
    required_error: "יש לבחור סוג פעולה",
  }),
  amount: z.coerce
    .number({
      required_error: "יש להזין סכום",
      invalid_type_error: "סכום חייב להיות מספר",
    })
    .min(1, "הסכום חייב להיות גדול מ-0")
    .max(10000, "הסכום לא יכול להיות גדול מ-10,000 ₪"),
  description: z.string().min(1, "יש להזין תיאור").max(200, "התיאור ארוך מדי"),
})

type DirectPaymentFormData = z.infer<typeof directPaymentSchema>

interface DirectPaymentModalProps {
  bookingId: string
  bookingNumber: string
  customerName: string
  originalPaymentId?: string
  trigger?: React.ReactNode
  onSuccess?: (result: any) => void
}

export function DirectPaymentModal({
  bookingId,
  bookingNumber,
  customerName,
  originalPaymentId,
  trigger,
  onSuccess,
}: DirectPaymentModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const form = useForm<DirectPaymentFormData>({
    resolver: zodResolver(directPaymentSchema),
    defaultValues: {
      action: "charge",
      amount: 0,
      description: "",
    },
  })

  const selectedAction = form.watch("action")

  const onSubmit = async (data: DirectPaymentFormData) => {
    setIsLoading(true)
    setResult(null)

    try {
      logger.info("Starting direct payment", {
        bookingId,
        action: data.action,
        amount: data.amount,
      })

      const response = await fetch("/api/payments/direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          amount: data.amount,
          description: data.description,
          action: data.action,
          originalPaymentId: originalPaymentId || bookingId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setResult(result)
        toast.success(result.message || `${data.action === "charge" ? "החיוב" : "הזיכוי"} בוצע בהצלחה`)
        
        if (onSuccess) {
          onSuccess(result)
        }

        // Reset form for next use
        form.reset()
      } else {
        throw new Error(result.error || "שגיאה לא ידועה")
      }
    } catch (error) {
      logger.error("Direct payment failed", {
        error: error instanceof Error ? error.message : String(error),
        bookingId,
        action: data.action,
      })

      toast.error(error instanceof Error ? error.message : "שגיאה בביצוע הפעולה")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setResult(null)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CreditCard className="w-4 h-4 mr-2" />
            חיוב/זיכוי
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            חיוב/זיכוי ישיר
          </DialogTitle>
        </DialogHeader>

        {/* Booking Info */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div><strong>הזמנה:</strong> {bookingNumber}</div>
              <div><strong>לקוח:</strong> {customerName}</div>
              <div className="text-xs text-gray-500">
                הפעולה תתבצע באמצעות הטוקן השמור מהתשלום המקורי
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {result ? (
          /* Success Result */
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium mb-2">
                  {result.action === "charge" ? "החיוב" : "הזיכוי"} בוצע בהצלחה!
                </div>
                <div className="space-y-1 text-sm">
                  <div>סכום: ₪{result.amount}</div>
                  <div>מזהה תשלום: {result.paymentId}</div>
                  {result.transactionId && (
                    <div>מזהה עסקה: {result.transactionId}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">
                סגור
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setResult(null)}
                className="flex-1"
              >
                פעולה נוספת
              </Button>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סוג פעולה</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג פעולה" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="charge">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            חיוב נוסף
                          </div>
                        </SelectItem>
                        <SelectItem value="refund">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            זיכוי/החזר
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      סכום {selectedAction === "charge" ? "לחיוב" : "לזיכוי"} (₪)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="10000"
                        placeholder="0.00"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תיאור הפעולה</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`תיאור ${selectedAction === "charge" ? "החיוב" : "הזיכוי"}...`}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="font-medium mb-1">אזהרה</div>
                  <div className="text-sm">
                    {selectedAction === "charge" 
                      ? "הפעולה תחייב את הלקוח באופן מיידי ולא ניתנת לביטול"
                      : "הפעולה תזכה את הלקוח באופן מיידי וכספו יוחזר לכרטיס האשראי"
                    }
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {selectedAction === "charge" ? "בצע חיוב" : "בצע זיכוי"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
} 