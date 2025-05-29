"use client"

import type React from "react"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import dayjs, { type Dayjs } from "dayjs"
import { useTranslation } from "next-i18next"

interface CouponFormProps {
  onSubmit: (data: CouponFormData) => void
  initialValues?: CouponFormData
}

interface CouponFormData {
  code: string
  discountValue: number
  discountType: "percentage" | "fixed"
  expiryDate: Dayjs | null
}

const validationSchema = (t: any) =>
  yup.object({
    code: yup
      .string()
      .required(t("coupons.validation.codeRequired"))
      .min(3, t("coupons.validation.codeMinLength"))
      .max(20, t("coupons.validation.codeMaxLength")),
    discountValue: yup
      .number()
      .required(t("coupons.validation.discountValueRequired"))
      .min(0, t("coupons.validation.discountValueMin"))
      .max(100, t("coupons.validation.discountValueMax")),
    discountType: yup.string().required(t("coupons.validation.discountTypeRequired")),
    expiryDate: yup
      .date()
      .nullable()
      .transform((_, originalValue) => {
        return originalValue ? dayjs(originalValue) : null
      })
      .test(
        "is-future-date",
        t("coupons.validation.expiryDateFuture"),
        (value) => value === null || dayjs(value).isAfter(dayjs()),
      ),
  })

const CouponForm: React.FC<CouponFormProps> = ({ onSubmit, initialValues }) => {
  const { t } = useTranslation()
  const [expiryDateValue, setExpiryDateValue] = useState<Dayjs | null>(initialValues?.expiryDate || null)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: yupResolver(validationSchema(t)),
    defaultValues: {
      code: initialValues?.code || "",
      discountValue: initialValues?.discountValue || 0,
      discountType: initialValues?.discountType || "percentage",
      expiryDate: initialValues?.expiryDate || null,
    },
  })

  const handleDateChange = (date: Dayjs | null) => {
    setExpiryDateValue(date)
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t("coupons.form.title")}
      </Typography>
      <Controller
        name="code"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label={t("coupons.fields.code")}
            placeholder={t("coupons.fields.codePlaceholder") || t("coupons.fields.code")}
            fullWidth
            margin="normal"
            error={!!errors.code}
            helperText={errors.code?.message}
          />
        )}
      />
      <Controller
        name="discountValue"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label={t("coupons.fields.discountValue")}
            type="number"
            fullWidth
            margin="normal"
            error={!!errors.discountValue}
            helperText={errors.discountValue?.message}
          />
        )}
      />
      <Controller
        name="discountType"
        control={control}
        render={({ field }) => (
          <FormControl fullWidth margin="normal" error={!!errors.discountType}>
            <InputLabel id="discount-type-label">{t("coupons.fields.discountType")}</InputLabel>
            <Select
              labelId="discount-type-label"
              id="discount-type"
              value={field.value}
              label={t("coupons.fields.discountType")}
              onChange={field.onChange}
            >
              <MenuItem value="percentage">{t("coupons.discountTypes.percentage")}</MenuItem>
              <MenuItem value="fixed">{t("coupons.discountTypes.fixed")}</MenuItem>
            </Select>
            {errors.discountType && <FormHelperText>{errors.discountType.message}</FormHelperText>}
          </FormControl>
        )}
      />
      <FormControl fullWidth margin="normal" error={!!errors.expiryDate}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Controller
            name="expiryDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label={t("coupons.fields.expiryDate")}
                value={expiryDateValue}
                onChange={(date: Dayjs | null) => {
                  handleDateChange(date)
                  field.onChange(date)
                }}
                renderInput={(params) => <TextField {...params} />}
              />
            )}
          />
        </LocalizationProvider>
        {errors.expiryDate && <FormHelperText>{errors.expiryDate.message}</FormHelperText>}
      </FormControl>

      <Button type="submit" variant="contained" color="primary">
        {t("common.submit")}
      </Button>
    </Box>
  )
}

export default CouponForm
