"use client"

import type React from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Typography,
  Input,
  Button,
  Select,
  Option,
} from "@material-tailwind/react"
import type { User } from "@/types"
import { useTranslation } from "@/lib/translations/i18n"

interface UserFormProps {
  onSubmit: (data: User) => void
  initialValues?: User
  roles: string[]
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, initialValues, roles }) => {
  const { t } = useTranslation()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<User>({
    defaultValues: initialValues,
  })

  const submitHandler: SubmitHandler<User> = (data) => {
    onSubmit(data)
    reset()
  }

  return (
    <Card>
      <CardHeader variant="gradient" color="blue" className="mb-4 p-6">
        <Typography variant="h6" color="white">
          {t("userForm.title")}
        </Typography>
      </CardHeader>
      <CardBody className="p-6">
        <form onSubmit={handleSubmit(submitHandler)}>
          <div className="mb-4">
            <Input
              label={t("userForm.firstName")}
              size="lg"
              {...register("firstName", { required: t("userForm.firstNameRequired") })}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
          </div>
          <div className="mb-4">
            <Input
              label={t("userForm.lastName")}
              size="lg"
              {...register("lastName", { required: t("userForm.lastNameRequired") })}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          </div>
          <div className="mb-4">
            <Input
              label={t("userForm.email")}
              size="lg"
              {...register("email", {
                required: t("userForm.emailRequired"),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t("userForm.emailInvalid"),
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </div>
          <div className="mb-4">
            <Input
              label={t("userForm.password")}
              type="password"
              size="lg"
              {...register("password", { required: initialValues ? false : t("userForm.passwordRequired") })}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          </div>
          <div className="mb-4">
            <Select label={t("userForm.role")} {...register("role", { required: t("userForm.roleRequired") })}>
              {roles.map((role) => (
                <Option key={role} value={role}>
                  {role}
                </Option>
              ))}
            </Select>
            {errors.role && (
              <Typography variant="small" color="red" className="mt-2">
                {errors.role.message}
              </Typography>
            )}
          </div>
          <CardFooter className="pt-0">
            <Button type="submit" variant="gradient" color="blue" fullWidth>
              {t("userForm.submit")}
            </Button>
          </CardFooter>
        </form>
      </CardBody>
    </Card>
  )
}

export default UserForm
