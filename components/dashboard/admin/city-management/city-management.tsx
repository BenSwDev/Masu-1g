"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { CustomPagination } from "@/components/common/ui/pagination"
import { CityFormDialog } from "./city-form-dialog"
import { useTranslation } from "@/lib/translations/i18n"
import { getCities, toggleCityStatus } from "@/app/dashboard/(user)/(roles)/admin/cities/actions"
import { Checkbox } from "@/components/common/ui/checkbox"
import { useToast } from "@/components/common/ui/use-toast"

interface CityData {
  id: string
  name: string
  isActive: boolean
  coordinates: { lat: number; lng: number }
}

interface CityManagementProps {
  initialCities: CityData[]
  totalPages: number
  currentPage: number
  initialSearch?: string
}

export function CityManagement({ initialCities, totalPages: initialTotalPages, currentPage: initialPage, initialSearch = "" }: CityManagementProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [cities, setCities] = useState(initialCities)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(initialPage)
  const [pages, setPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)

  const handleToggleStatus = async (cityId: string) => {
    const city = cities.find((c) => c.id === cityId)
    if (!city) return
    try {
      await toggleCityStatus(cityId)
      toast({
        title: city.isActive
          ? t("admin.cities.deactivateSuccess")
          : t("admin.cities.activateSuccess"),
      })
      setCities((prev) =>
        prev.map((c) =>
          c.id === cityId ? { ...c, isActive: !c.isActive } : c
        )
      )
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("admin.cities.statusUpdateError"),
        variant: "destructive",
      })
    }
  }

  const loadCities = async (newPage = 1, term = search) => {
    setLoading(true)
    try {
      const result = await getCities(newPage, 10, term)
      if (result.success) {
        setCities(result.cities as CityData[])
        setPages(result.totalPages)
        setPage(newPage)
      }
    } catch (error) {
      console.error("Error loading cities:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCities(1, search)
  }, [search])

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.cities.searchPlaceholder") as string}
          className="max-w-xs"
        />
        <Button onClick={() => setOpen(true)}>{t("admin.cities.addCity")}</Button>
      </div>
      <CityFormDialog 
        open={open} 
        onOpenChange={setOpen} 
        onSuccess={() => loadCities(1, search)}
      />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.cities.table.name")}</TableHead>
                <TableHead>{t("admin.cities.table.coordinates")}</TableHead>
                <TableHead>{t("admin.cities.table.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    {t("admin.cities.noCitiesFound")}
                  </TableCell>
                </TableRow>
              ) : (
                cities.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      {c.coordinates.lat}, {c.coordinates.lng}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={c.isActive}
                        onCheckedChange={() => handleToggleStatus(c.id)}
                        aria-label={t("admin.cities.table.status") as string}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {pages > 1 && (
        <CustomPagination currentPage={page} totalPages={pages} onPageChange={loadCities} isLoading={loading} />
      )}
    </div>
  )
}
