"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createTreatment } from "@/app/dashboard/(user)/(roles)/admin/treatments/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import { Badge } from "@/components/common/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Separator } from "@/components/common/ui/separator"
import { useToast } from "@/components/common/ui/use-toast"
import { 
  Plus, 
  Trash2, 
  Clock, 
  DollarSign, 
  Stethoscope,
  Info,
  AlertCircle,
  Sparkles,
  User,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

// Form schema
const treatmentSchema = z.object({
  name: z.string().min(2, "שם הטיפול חייב להכיל לפחות 2 תווים"),
  description: z.string().optional(),
  category: z.enum(["massages", "facial_treatments"], {
    required_error: "יש לבחור קטגוריה"
  }),
  pricingType: z.enum(["fixed", "duration_based"], {
    required_error: "יש לבחור סוג תמחור"
  }),
  fixedPrice: z.number().min(0, "המחיר חייב להיות גדול או שווה ל-0").optional(),
  fixedProfessionalPrice: z.number().min(0, "מחיר המטפל חייב להיות גדול או שווה ל-0").optional(),
  defaultDurationMinutes: z.number().min(1, "משך הזמן חייב להיות גדול מ-0").optional(),
  durations: z.array(z.object({
    minutes: z.number().min(1, "משך הזמן חייב להיות גדול מ-0"),
    price: z.number().min(0, "המחיר חייב להיות גדול או שווה ל-0"),
    professionalPrice: z.number().min(0, "מחיר המטפל חייב להיות גדול או שווה ל-0"),
    isActive: z.boolean().default(true)
  })).optional().default([]),
  isActive: z.boolean().default(true),
  allowTherapistGenderSelection: z.boolean().default(false)
}).refine((data) => {
  if (data.pricingType === "fixed") {
    return data.fixedPrice && data.fixedPrice > 0 && 
           data.fixedProfessionalPrice && data.fixedProfessionalPrice >= 0 &&
           data.defaultDurationMinutes && data.defaultDurationMinutes > 0
  }
  return true
}, {
  message: "עבור תמחור קבוע נדרש מחיר ללקוח, תשלום למטפל ומשך זמן",
  path: ["fixedPrice"]
}).refine((data) => {
  if (data.pricingType === "duration_based") {
    return data.durations && data.durations.length > 0
  }
  return true
}, {
  message: "עבור תמחור לפי זמן נדרש לפחות אפשרות אחת",
  path: ["durations"]
})

type FormData = z.infer<typeof treatmentSchema>

interface TreatmentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TreatmentCreateDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: TreatmentCreateDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      name: "",
      description: "",
      category: undefined,
      pricingType: undefined,
      fixedPrice: undefined,
      fixedProfessionalPrice: undefined,
      defaultDurationMinutes: undefined,
      durations: [],
      isActive: true,
      allowTherapistGenderSelection: false
    }
  })

  const watchPricingType = form.watch("pricingType")
  const watchDurations = form.watch("durations")

  const handleAddDuration = () => {
    const currentDurations = form.getValues("durations") || []
    form.setValue("durations", [
      ...currentDurations,
      { minutes: 60, price: 0, professionalPrice: 0, isActive: true }
    ])
  }

  const handleRemoveDuration = (index: number) => {
    const currentDurations = form.getValues("durations") || []
    form.setValue("durations", currentDurations.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true)
      
      const result = await createTreatment(data)
      
      if (result.success) {
        toast({
          title: "הצלחה!",
          description: "הטיפול נוצר בהצלחה"
        })
        form.reset()
        onSuccess()
        onOpenChange(false)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת הטיפול",
          description: result.error || "אירעה שגיאה לא צפויה"
        })
      }
    } catch (error) {
      console.error("Error creating treatment:", error)
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת הטיפול",
        description: "אירעה שגיאה בתקשורת עם השרת"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const categoryOptions = [
    { value: "massages", label: "עיסויים", icon: "💆‍♀️", description: "עיסויים טיפוליים ורפואיים" },
    { value: "facial_treatments", label: "טיפולי פנים", icon: "✨", description: "טיפולי יופי ורעננות לפנים" }
  ]

  const durationOptions = [50, 60, 75, 90, 120]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            יצירת טיפול חדש
          </DialogTitle>
          <DialogDescription>
            צור טיפול חדש עם כל הפרטים והגדרות התמחור
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פרטים בסיסיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם הטיפול *</FormLabel>
                        <FormControl>
                          <Input placeholder="הזן שם טיפול" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>קטגוריה *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="בחר קטגוריה" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <span>{option.icon}</span>
                                  <div>
                                    <div>{option.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {option.description}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>תיאור הטיפול</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="תאר את הטיפול, יתרונותיו ומה הוא כולל..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        תיאור זה יוצג ללקוחות בעת בחירת הטיפול
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pricing Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">הגדרות תמחור</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="pricingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>סוג תמחור *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="בחר סוג תמחור" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <div>
                                <div>מחיר קבוע</div>
                                <div className="text-xs text-muted-foreground">
                                  מחיר אחיד לכל הטיפול
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="duration_based">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <div>
                                <div>לפי משך זמן</div>
                                <div className="text-xs text-muted-foreground">
                                  מחירים שונים למשכי זמן שונים
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchPricingType === "fixed" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                    <FormField
                      control={form.control}
                      name="fixedPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>מחיר ללקוח (₪) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>המחיר שהלקוח ישלם</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fixedProfessionalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>תשלום למטפל (₪) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>הסכום שהמטפל יקבל</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defaultDurationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>משך זמן (דקות) *</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="בחר משך זמן" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {durationOptions.map((duration) => (
                                <SelectItem key={duration} value={duration.toString()}>
                                  {duration} דקות
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>משך הטיפול בדקות</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {watchPricingType === "duration_based" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">אפשרויות משך זמן</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddDuration}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        הוסף אפשרות
                      </Button>
                    </div>

                    {watchDurations && watchDurations.length > 0 ? (
                      <div className="space-y-3">
                        {watchDurations.map((duration, index) => (
                          <Card key={index} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                              <FormField
                                control={form.control}
                                name={`durations.${index}.minutes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>משך זמן (דקות)</FormLabel>
                                    <Select 
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                      value={field.value?.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="דקות" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {durationOptions.map((dur) => (
                                          <SelectItem key={dur} value={dur.toString()}>
                                            {dur} דקות
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`durations.${index}.price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>מחיר ללקוח (₪)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`durations.${index}.professionalPrice`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>תשלום למטפל (₪)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`durations.${index}.isActive`}
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm">פעיל</FormLabel>
                                  </FormItem>
                                )}
                              />

                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleRemoveDuration(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-6 text-center border-dashed">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                          לא הוגדרו אפשרויות משך זמן. לחץ על "הוסף אפשרות" להוספת אפשרות ראשונה.
                        </p>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  הגדרות נוספות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <FormLabel>טיפול פעיל</FormLabel>
                    <FormDescription>
                      האם הטיפול זמין להזמנה על ידי לקוחות
                    </FormDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      בחירת מין המטפל
                    </FormLabel>
                    <FormDescription>
                      האם לאפשר ללקוח לבחור את מין המטפל (זכר/נקבה)
                    </FormDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="allowTherapistGenderSelection"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "יוצר..." : "צור טיפול"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 