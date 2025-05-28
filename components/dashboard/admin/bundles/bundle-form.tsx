"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/common/ui/drawer"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Switch } from "@/components/common/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/common/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { DiscountType, type IBundle } from "@/lib/db/models/bundle"
import { Clock, Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"

const bundleFormSchema = z.object({
  name: z.string().min(2, { message: "שם החבילה חייב להכיל לפחות 2 תווים" }),
  description: z.string().optional(),
  category: z.string().min(1, { message: "יש לבחור קטגוריה" }),
  isActive: z.boolean().default(true),
  quantity: z.number().min(1, { message: "כמות הטיפולים חייבת להיות לפחות 1" }),
  validityMonths: z.number().min(1, { message: "תוקף החבילה חייב להיות לפחות חודש אחד" }),
  treatments: z
    .array(
      z.object({
        treatmentId: z.string(),
        name: z.string(),
        isSelected: z.boolean().default(false),
      }),
    )
    .refine((treatments) => treatments.some((t) => t.isSelected), {
      message: "יש לבחור לפחות טיפול אחד",
    }),
  discountType: z.enum([DiscountType.FREE_QUANTITY, DiscountType.PERCENTAGE, DiscountType.FIXED_AMOUNT]),
  discountValue: z.number().min(0, { message: "ערך ההנחה לא יכול להיות שלילי" }),
})

type BundleFormValues = z.infer<typeof bundleFormSchema>

interface BundleFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<boolean>
  bundle?: IBundle
  treatments: any[]
  categories: string[]
  isSubmitting: boolean
}

const getCategoryDisplayName = (category: string) => {
  switch (category) {
    case "massages":
      return "עיסויים"
    case "facial_treatments":
      return "טיפולי פנים"
    default:
      return category
  }
}

export function BundleForm({
  isOpen,
  onClose,
  onSubmit,
  bundle,
  treatments,
  categories,
  isSubmitting,
}: BundleFormProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: categories[0] || "",
      isActive: true,
      quantity: 5,
      validityMonths: 12,
      treatments: [],
      discountType: DiscountType.FREE_QUANTITY,
      discountValue: 1,
    },
  })

  useEffect(() => {
    if (bundle) {
      const treatmentsWithSelection = treatments.map((treatment) => ({
        treatmentId: treatment._id,
        name: treatment.name,
        isSelected: bundle.treatments.some((t) => t.treatmentId.toString() === treatment._id.toString()),
      }))

      form.reset({
        name: bundle.name,
        description: bundle.description || "",
        category: bundle.category,
        isActive: bundle.isActive,
        quantity: bundle.quantity,
        validityMonths: bundle.validityMonths,
        treatments: treatmentsWithSelection,
        discountType: bundle.discountType as DiscountType,
        discountValue: bundle.discountValue,
      })
    } else {
      const initialTreatments = treatments.map((treatment) => ({
        treatmentId: treatment._id,
        name: treatment.name,
        isSelected: false,
      }))

      form.reset({
        name: "",
        description: "",
        category: categories[0] || "",
        isActive: true,
        quantity: 5,
        validityMonths: 12,
        treatments: initialTreatments,
        discountType: DiscountType.FREE_QUANTITY,
        discountValue: 1,
      })
    }
  }, [bundle, treatments, categories, form, isOpen])

  const handleSubmit = async (values: BundleFormValues) => {
    setFormError(null)
    try {
      const selectedTreatments = values.treatments
        .filter((t) => t.isSelected)
        .map(({ treatmentId, name }) => ({ treatmentId, name }))

      if (selectedTreatments.length === 0) {
        setFormError("יש לבחור לפחות טיפול אחד")
        setActiveTab("treatments")
        return
      }

      if (values.discountType === DiscountType.FREE_QUANTITY && values.discountValue > values.quantity) {
        setFormError("כמות הטיפולים החינם לא יכולה להיות גדולה מכמות הטיפולים הכוללת")
        setActiveTab("discount")
        return
      }

      if (values.discountType === DiscountType.PERCENTAGE && values.discountValue > 100) {
        setFormError("אחוז ההנחה לא יכול להיות גדול מ-100%")
        setActiveTab("discount")
        return
      }

      const bundleData = {
        ...values,
        treatments: selectedTreatments,
      }

      const success = await onSubmit(bundleData)
      if (!success) {
        // Error is handled by the parent component
      }
    } catch (error) {
      console.error("Error submitting bundle form:", error)
      setFormError("אירעה שגיאה בשמירת החבילה. נסה שוב.")
    }
  }

  const filteredTreatments = form.watch("category")
    ? treatments.filter((t) => t.category === form.watch("category"))
    : []

  useEffect(() => {
    const category = form.watch("category")
    if (category) {
      const treatmentsInCategory = treatments
        .filter((t) => t.category === category)
        .map((treatment) => ({
          treatmentId: treatment._id,
          name: treatment.name,
          isSelected: false,
        }))

      form.setValue("treatments", treatmentsInCategory)
    }
  }, [form.watch("category"), treatments, form])

  useEffect(() => {
    const discountType = form.watch("discountType")
    const quantity = form.watch("quantity")
    const discountValue = form.watch("discountValue")

    if (discountType === DiscountType.FREE_QUANTITY && discountValue > quantity) {
      form.setValue("discountValue", quantity)
    } else if (discountType === DiscountType.PERCENTAGE && discountValue > 100) {
      form.setValue("discountValue", 100)
    }
  }, [form.watch("discountType"), form.watch("quantity"), form.watch("discountValue"), form])

  const hasSelectedTreatments = form.watch("treatments").some((t) => t.isSelected)

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="bottom">
      <DrawerContent className="h-[95vh] mx-4 sm:mx-auto max-w-lg">
        <div className="flex flex-col h-full">
          <DrawerHeader className="flex-shrink-0 pb-2">
            <DrawerTitle className="text-center text-lg">{bundle ? "עריכת חבילה" : "הוספת חבילה חדשה"}</DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {formError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>שגיאה</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 sticky top-0 bg-background z-10 mb-4">
                <TabsTrigger value="details" className="text-xs">
                  פרטים
                </TabsTrigger>
                <TabsTrigger value="treatments" className="text-xs">
                  טיפולים
                </TabsTrigger>
                <TabsTrigger value="discount" className="text-xs">
                  הנחה
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  תצוגה
                </TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <TabsContent value="details" className="space-y-4 mt-0">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>שם החבילה</FormLabel>
                          <FormControl>
                            <Input placeholder="לדוגמא: חבילת 5+1 עיסויים" {...field} />
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
                          <FormLabel>קטגוריה</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              {categories.map((category) => (
                                <option key={category} value={category}>
                                  {getCategoryDisplayName(category)}
                                </option>
                              ))}
                            </select>
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
                          <FormLabel>תיאור (אופציונלי)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="תיאור החבילה..." rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>כמות טיפולים</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
                                className="text-center"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="validityMonths"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>תוקף (חודשים)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 1)}
                                className="text-center"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">סטטוס</FormLabel>
                            <FormDescription className="text-xs">האם החבילה פעילה ומוצגת ללקוחות?</FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-teal-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="treatments" className="space-y-4 mt-0">
                    <div className="mb-4">
                      <h3 className="text-base font-medium mb-2">טיפולים זמינים בחבילה</h3>
                      <p className="text-xs text-gray-500">
                        בחר את הטיפולים שיהיו זמינים בחבילה זו. כל הטיפולים חייבים להיות מאותה קטגוריה.
                      </p>
                    </div>

                    <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                      {filteredTreatments.length > 0 ? (
                        <div className="space-y-3">
                          {filteredTreatments.map((treatment, index) => (
                            <div key={treatment._id} className="flex items-center space-x-2 rtl:space-x-reverse">
                              <Checkbox
                                id={`treatment-${treatment._id}`}
                                checked={form.watch(`treatments.${index}.isSelected`)}
                                onCheckedChange={(checked) => {
                                  const treatments = [...form.getValues("treatments")]
                                  treatments[index].isSelected = !!checked
                                  form.setValue("treatments", treatments)
                                }}
                              />
                              <Label htmlFor={`treatment-${treatment._id}`} className="flex-1 cursor-pointer text-sm">
                                {treatment.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500 text-sm">אין טיפולים זמינים בקטגוריה זו</div>
                      )}
                    </div>

                    {!hasSelectedTreatments && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-800 text-sm">שים לב</AlertTitle>
                        <AlertDescription className="text-orange-700 text-xs">
                          יש לבחור לפחות טיפול אחד
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="discount" className="space-y-4 mt-0">
                    <div className="mb-4">
                      <h3 className="text-base font-medium mb-2">הגדרת הנחה</h3>
                      <p className="text-xs text-gray-500">בחר את סוג ההנחה שתינתן בחבילה זו.</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>סוג הנחה</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <RadioGroupItem
                                  value={DiscountType.FREE_QUANTITY}
                                  id="discount-free"
                                  checked={field.value === DiscountType.FREE_QUANTITY}
                                />
                                <Label htmlFor="discount-free" className="text-sm">
                                  כמות חינם
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <RadioGroupItem
                                  value={DiscountType.PERCENTAGE}
                                  id="discount-percentage"
                                  checked={field.value === DiscountType.PERCENTAGE}
                                />
                                <Label htmlFor="discount-percentage" className="text-sm">
                                  אחוז הנחה
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <RadioGroupItem
                                  value={DiscountType.FIXED_AMOUNT}
                                  id="discount-fixed"
                                  checked={field.value === DiscountType.FIXED_AMOUNT}
                                />
                                <Label htmlFor="discount-fixed" className="text-sm">
                                  סכום הנחה קבוע
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            {form.watch("discountType") === DiscountType.FREE_QUANTITY
                              ? "כמות טיפולים חינם"
                              : form.watch("discountType") === DiscountType.PERCENTAGE
                                ? "אחוז הנחה"
                                : "סכום הנחה (₪)"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={
                                form.watch("discountType") === DiscountType.FREE_QUANTITY
                                  ? form.watch("quantity")
                                  : form.watch("discountType") === DiscountType.PERCENTAGE
                                    ? 100
                                    : undefined
                              }
                              {...field}
                              onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 0)}
                              className="text-center max-w-32"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {form.watch("discountType") === DiscountType.FREE_QUANTITY
                              ? `מתוך ${form.watch("quantity")} טיפולים בסך הכל`
                              : form.watch("discountType") === DiscountType.PERCENTAGE
                                ? "הזן ערך בין 0 ל-100"
                                : "הזן סכום הנחה בשקלים"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4 mt-0">
                    <div className="mb-4">
                      <h3 className="text-base font-medium mb-2">תצוגה מקדימה</h3>
                      <p className="text-xs text-gray-500">בדוק את פרטי החבילה לפני שמירה.</p>
                    </div>

                    <div className="border rounded-md p-4 space-y-3 max-h-80 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <h4 className="font-medium text-gray-700 text-xs">שם החבילה</h4>
                          <p className="text-gray-900">{form.watch("name") || "לא הוגדר"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 text-xs">קטגוריה</h4>
                          <p className="text-gray-900">{getCategoryDisplayName(form.watch("category"))}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 text-xs">כמות טיפולים</h4>
                          <p className="text-gray-900 text-center">{form.watch("quantity")}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 text-xs">תוקף</h4>
                          <p className="text-gray-900 text-center">{form.watch("validityMonths")} חודשים</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 text-xs">סטטוס</h4>
                          <p className="text-gray-900">{form.watch("isActive") ? "פעיל" : "לא פעיל"}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 text-xs">הנחה</h4>
                          <p className="text-gray-900">
                            {form.watch("discountType") === DiscountType.FREE_QUANTITY
                              ? `${form.watch("discountValue")} טיפולים חינם`
                              : form.watch("discountType") === DiscountType.PERCENTAGE
                                ? `${form.watch("discountValue")}% הנחה`
                                : `₪${form.watch("discountValue")} הנחה`}
                          </p>
                        </div>
                      </div>

                      {form.watch("description") && (
                        <div>
                          <h4 className="font-medium text-gray-700 text-xs">תיאור</h4>
                          <p className="text-gray-900 text-sm">{form.watch("description")}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium text-gray-700 text-xs mb-2">טיפולים כלולים</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {form
                            .watch("treatments")
                            .filter((t) => t.isSelected)
                            .map((treatment, index) => (
                              <div key={index} className="flex items-center">
                                <Clock className="w-3 h-3 ml-1 text-gray-400" />
                                <span className="text-xs text-gray-900">{treatment.name}</span>
                              </div>
                            ))}
                          {form.watch("treatments").filter((t) => t.isSelected).length === 0 && (
                            <p className="text-xs text-gray-500">לא נבחרו טיפולים</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </form>
              </Form>
            </Tabs>
          </div>

          <DrawerFooter className="flex-shrink-0 pt-2">
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeTab === "details") {
                    onClose()
                  } else if (activeTab === "treatments") {
                    setActiveTab("details")
                  } else if (activeTab === "discount") {
                    setActiveTab("treatments")
                  } else if (activeTab === "preview") {
                    setActiveTab("discount")
                  }
                }}
                className="flex-1"
              >
                {activeTab === "details" ? "ביטול" : "חזרה"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (activeTab === "details") {
                    setActiveTab("treatments")
                  } else if (activeTab === "treatments") {
                    if (!hasSelectedTreatments) {
                      setFormError("יש לבחור לפחות טיפול אחד")
                      return
                    }
                    setActiveTab("discount")
                  } else if (activeTab === "discount") {
                    setActiveTab("preview")
                  } else if (activeTab === "preview") {
                    form.handleSubmit(handleSubmit)()
                  }
                }}
                disabled={isSubmitting || (activeTab === "treatments" && !hasSelectedTreatments)}
                className="bg-teal-500 hover:bg-teal-600 flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    שומר...
                  </>
                ) : activeTab === "preview" ? (
                  bundle ? (
                    "עדכן חבילה"
                  ) : (
                    "צור חבילה"
                  )
                ) : (
                  "הבא"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
