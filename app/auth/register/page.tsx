import { MasuLogo } from "@/components/common/masu-logo"
import { RegisterForm } from "@/components/auth/register/register-form"
import { AuthRedirect } from "@/components/auth/auth-redirect"

export default function RegisterPage() {
  return (
    <AuthRedirect>
      <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-turquoise-50 via-white to-turquoise-100 p-4 py-6 md:p-6">
        <div className="w-full max-w-lg">
          <div className="mb-4 flex justify-center">
            <MasuLogo />
          </div>
          <RegisterForm />
        </div>

        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-turquoise-200/30 blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-turquoise-200/20 blur-3xl"></div>
        </div>
      </div>
    </AuthRedirect>
  )
}
