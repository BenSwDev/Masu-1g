"use client"

import { useState, useEffect } from "react"
import type React from "react"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { CustomPagination } from "@/components/common/ui/pagination"
import { ProfessionalFormDialog } from "./professional-form-dialog"
import { useTranslation } from "@/lib/translations/i18n"
import { getProfessionals } from "@/actions/professional-actions"

export interface ProfessionalData {
  id: string
  name: string | null
  email: string | null
  phone?: string | null
  professionalNumber: string
  status: string
}

interface ProfessionalManagementProps {
  initialProfessionals: ProfessionalData[]
  totalPages: number
  currentPage: number
  initialSearch?: string
}

export function ProfessionalManagement({ initialProfessionals, totalPages: initialTotalPages, currentPage: initialPage, initialSearch = "" }: ProfessionalManagementProps) {
  const { t, dir } = useTranslation()
  const [professionals, setProfessionals] = useState(initialProfessionals)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(initialPage)
  const [pages, setPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)

  const loadProfessionals = async (newPage = 1, term = search) => {
    setLoading(true)
    const result = await getProfessionals(newPage, 10, term)
    if (result.success) {
      setProfessionals(result.professionals)
      setPages(result.totalPages)
      setPage(newPage)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProfessionals(1, search)
  }, [search])

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.professionals.searchPlaceholder")}
          className="max-w-xs"
        />
        <Button onClick={() => setOpen(true)}>{t("admin.professionals.addProfessional")}</Button>
      </div>
      <ProfessionalFormDialog open={open} onOpenChange={setOpen} />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.professionals.table.name")}</TableHead>
                <TableHead>{t("admin.professionals.table.email")}</TableHead>
                <TableHead>{t("admin.professionals.table.phone")}</TableHead>
                <TableHead>{t("admin.professionals.table.number")}</TableHead>
                <TableHead>{t("admin.professionals.table.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {t("admin.professionals.noProfessionalsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                professionals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.phone}</TableCell>
                    <TableCell>{p.professionalNumber}</TableCell>
                    <TableCell>{t(`admin.professionals.statuses.${p.status}`)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {pages > 1 && (
        <CustomPagination currentPage={page} totalPages={pages} onPageChange={loadProfessionals} isLoading={loading} />
      )}
    </div>
  )
}
