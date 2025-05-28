"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getBundles } from "@/actions/bundle-actions"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent } from "@/components/common/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { BundleCard } from "./bundle-card"
import { BundleForm } from "./bundle-form"
import { PlusIcon, SearchIcon } from "lucide-react"
import { Skeleton } from "@/components/common/ui/skeleton"
import { useToast } from "@/components/common/ui/use-toast"

export function BundlesClient() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isAddingBundle, setIsAddingBundle] = useState(false)
  const [editingBundle, setEditingBundle] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  const {
    data: bundlesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const result = await getBundles()
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch bundles")
      }
      return result
    },
  })

  const bundles = bundlesData?.bundles || []

  const handleAddSuccess = () => {
    setIsAddingBundle(false)
    refetch()
    toast({
      title: t("bundles.createSuccess"),
      variant: "success",
    })
  }

  const handleEditSuccess = () => {
    setEditingBundle(null)
    refetch()
    toast({
      title: t("bundles.updateSuccess"),
      variant: "success",
    })
  }

  const handleCancel = () => {
    setIsAddingBundle(false)
    setEditingBundle(null)
  }

  const filteredBundles = bundles.filter((bundle) => {
    const matchesSearch = bundle.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === "all" || bundle.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const categories = ["all", ...new Set(bundles.map((b) => b.category))]

  if (isAddingBundle) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t("bundles.addNew")}</h1>
        <BundleForm onSuccess={handleAddSuccess} onCancel={handleCancel} />
      </div>
    )
  }

  if (editingBundle) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t("bundles.edit")}</h1>
        <BundleForm bundle={editingBundle} onSuccess={handleEditSuccess} onCancel={handleCancel} />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">{t("bundles.title")}</h1>
        <Button onClick={() => setIsAddingBundle(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("bundles.addNew")}
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("bundles.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {categories.length > 1 && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="mb-4 flex flex-wrap">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category === "all" ? t("common.all") : t(`bundles.categories.${category}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
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
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">{t("common.error")}</p>
          </CardContent>
        </Card>
      ) : filteredBundles.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center">{t("bundles.noBundles")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBundles.map((bundle) => (
            <BundleCard key={bundle._id} bundle={bundle} onEdit={() => setEditingBundle(bundle)} onRefresh={refetch} />
          ))}
        </div>
      )}
    </div>
  )
}
