"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getTreatments } from "@/actions/treatment-actions"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent } from "@/components/common/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { TreatmentCard } from "./treatment-card"
import { TreatmentForm } from "./treatment-form"
import { PlusIcon, SearchIcon } from "lucide-react"
import { Skeleton } from "@/components/common/ui/skeleton"
import { useToast } from "@/components/common/ui/use-toast"

export function TreatmentsClient() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [isAddingTreatment, setIsAddingTreatment] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["treatments"],
    queryFn: async () => {
      const result = await getTreatments()
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch treatments")
      }
      return result.treatments || []
    },
  })

  const treatments = data || []

  const handleAddSuccess = () => {
    setIsAddingTreatment(false)
    refetch()
    toast({
      title: t("treatments.createSuccess"),
      variant: "success",
    })
  }

  const handleEditSuccess = () => {
    setEditingTreatment(null)
    refetch()
    toast({
      title: t("treatments.updateSuccess"),
      variant: "success",
    })
  }

  const handleCancel = () => {
    setIsAddingTreatment(false)
    setEditingTreatment(null)
  }

  const filteredTreatments = Array.isArray(treatments)
    ? treatments.filter((treatment) => {
        const matchesSearch = treatment.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = activeCategory === "all" || treatment.category === activeCategory
        return matchesSearch && matchesCategory
      })
    : []

  const categories = ["all", "massages", "facial_treatments"]

  if (isAddingTreatment) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t("treatments.addNew")}</h1>
        <TreatmentForm onSuccess={handleAddSuccess} onCancel={handleCancel} />
      </div>
    )
  }

  if (editingTreatment) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t("treatments.edit")}</h1>
        <TreatmentForm treatment={editingTreatment} onSuccess={handleEditSuccess} onCancel={handleCancel} />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4" dir={dir}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 sm:mb-0">{t("treatments.title")}</h1>
        <Button onClick={() => setIsAddingTreatment(true)} className="w-full sm:w-auto">
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("treatments.addNew")}
        </Button>
      </div>

      <div className="mb-8">
        <div className="relative max-w-md">
          <SearchIcon className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={t("treatments.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${dir === 'rtl' ? 'pr-10' : 'pl-10'} w-full`}
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
        <TabsList className="mb-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category === "all" ? t("common.all") : t(`treatments.categories.${category}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex justify-end space-x-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-center text-destructive">{t("common.error")}</p>
          </CardContent>
        </Card>
      ) : filteredTreatments.length === 0 ? (
        <Card className="border-muted">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">{t("treatments.noTreatments")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreatments.map((treatment) => (
            <TreatmentCard
              key={treatment._id}
              treatment={treatment}
              onEdit={() => setEditingTreatment(treatment)}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}
    </div>
  )
}
