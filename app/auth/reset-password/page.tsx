import { MasuLogo } from "@/components/common/masu-logo"
import { ResetPasswordForm } from "@/components/auth/reset-password/reset-password-form"

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-turquoise-50 via-white to-turquoise-100 p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <MasuLogo />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Reset Link</h1>
            <p className="text-muted-foreground mb-6">
              The password reset link is invalid or missing. Please request a new password reset.
            </p>
            <a
              href="/auth/forgot-password"
              className="inline-block px-6 py-2 bg-turquoise-500 text-white rounded-md hover:bg-turquoise-600 transition-colors"
            >
              Request New Reset Link
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-turquoise-50 via-white to-turquoise-100 p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <MasuLogo />
        </div>
        <ResetPasswordForm token={token} />
      </div>

      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-turquoise-200/30 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-turquoise-200/20 blur-3xl"></div>
      </div>
    </div>
  )
}
