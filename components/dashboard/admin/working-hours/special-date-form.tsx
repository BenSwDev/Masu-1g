"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, DollarSign } from "lucide-react"
import type { IWorkingHours } from "@/lib/db/models/working-hours"
import { format } from "date-fns"
import { toast } from "sonner"

interface SpecialDateFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<IWorkingHours["specialDates"][0], "_id">) => Promise<void>
  editingDate?: IWorkingHours["specialDates"][0] | null
}

export function SpecialDateForm({ isOpen, onClose, onSubmit, editingDate }: SpecialDateFormProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    description: "",
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    priceAdjustment: {
      type: "none" as "none" | "percentage" | "fixed",
      value: 0,
      reason: "",
    },
  })

  useEffect(() => {
    if (editingDate) {
      setFormData({
        name: editingDate.name,
        date: format(new Date(editingDate.date), "yyyy-MM-dd"),
        description: editingDate.description || "",
        isActive: editingDate.isActive,
        startTime: editingDate.startTime || "09:00",
        endTime: editingDate.endTime || "17:00",
        priceAdjustment: {
          type: editingDate.priceAdjustment?.type || "none",
          value: editingDate.priceAdjustment?.value || 0,
          reason: editingDate.priceAdjustment?.reason || "",
        },
      })
    } else {
      setFormData({
        name: "",
        date: "",
        description: "",
        isActive: true,
        startTime: "09:00",
        endTime: "17:00",
        priceAdjustment: {
          type: "none",
          value: 0,
          reason: "",
        },
      })
    }
  }, [editingDate, isOpen])

  const handleSubmit = async () => {
    if (!formData.name || !formData.date) {
      toast.error("אנא מלא את כל השדות הנדרשים")
      return
    }

    if (formData.isActive && formData.startTime >= formData.endTime) {
      toast.error("שעת הסיום חייבת להיות אחרי שעת ההתחלה")
      return
    }

    setIsLoading(true)
    try {
      const submitData: any = {
        name: formData.name,
        date: new Date(formData.date),
        description: formData.description || undefined,
        isActive: formData.isActive,
      }

      if (formData.isActive) {
        submitData.startTime = formData.startTime
        submitData.endTime = formData.endTime
      }

      if (formData.priceAdjustment.type !== "none" && formData.priceAdjustment.value > 0) {
        submitData.priceAdjustment = {
          type: formData.priceAdjustment.type,
          value: formData.priceAdjustment.value,
          reason: formData.priceAdjustment.reason || undefined,
        }
      }

      await onSubmit(submitData)
      onClose()
      toast.success(editingDate ? "התאריך עודכן בהצלחה" : "התאריך נוסף בהצלחה")
    } catch (error) {
      toast.error("שגיאה בשמירת התאריך")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[95vh]">
        <div className="flex flex-col h-full rtl:text-right">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle className="text-center text-lg">
              {editingDate ? "עריכת תאריך מיוחד" : "הוספת תאריך מיוחד"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sticky top-0 bg-background z-10 mb-4">
                <TabsTrigger value="basic" className="text-xs">
                  <Calendar className="h-3 w-3 ml-1" />
                  פרטים
                </TabsTrigger>
                <TabsTrigger value="hours" className="text-xs">
                  <Clock className="h-3 w-3 ml-1" />
                  שעות
                </TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs">
                  <DollarSign className="h-3 w-3 ml-1" />
                  תמחור
                </TabsTrigger>
              </TabsList>

              <div className="space-y-4 rtl:text-right">
                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">
                      שם התאריך *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="למשל: חג המולד"
                    />
                  </div>

                  <div>
                    <Label htmlFor="date" className="text-sm">
                      תאריך *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="text-center"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm">
                      תיאור
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="תיאור אופציונלי לתאריך"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="hours" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">היום פעיל</Label>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                      className="data-[state=checked]:bg-teal-500"
                    />
                  </div>

                  {formData.isActive && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="startTime" className="text-sm">
                          שעת התחלה
                        </Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                          className="text-center"
                        />
                      </div>

                      <div>
                        <Label htmlFor="endTime" className="text-sm">
                          שעת סיום
                        </Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                          className="text-center"
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4">
                  <div>
                    <Label className="text-sm">סוג תוספת מחיר</Label>
                    <Select
                      value={formData.priceAdjustment.type}
                      onValueChange={(value: "none" | "percentage" | "fixed") =>
                        setFormData((prev) => ({
                          ...prev,
                          priceAdjustment: { ...prev.priceAdjustment, type: value, value: 0 },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא תוספת</SelectItem>
                        <SelectItem value="percentage">אחוז תוספת</SelectItem>
                        <SelectItem value="fixed">סכום קבוע</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.priceAdjustment.type !== "none" && (
                    <>
                      <div>
                        <Label className="text-sm">
                          {formData.priceAdjustment.type === "percentage" ? "אחוז תוספת (%)" : "סכום תוספת (₪)"}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.priceAdjustment.value}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              priceAdjustment: { ...prev.priceAdjustment, value: Number(e.target.value) },
                            }))
                          }
                          className="text-center max-w-32"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">סיבה לתוספת</Label>
                        <Input
                          value={formData.priceAdjustment.reason}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              priceAdjustment: { ...prev.priceAdjustment, reason: e.target.value },
                            }))
                          }
                          placeholder="למשל: חג מיוחד"
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DrawerFooter className="flex-shrink-0">
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-teal-500 hover:bg-teal-600">
                {isLoading ? "שומר..." : editingDate ? "עדכן" : "הוסף"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
                ביטול
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
