import { RoleProtectedRoute } from "@/components/auth/role-protected-route"
import { UserRole } from "@/lib/db/models/user"

const AdminUsersPage = () => {
  return (
    <RoleProtectedRoute requiredRole={UserRole.ADMIN}>
      <div>
        <h1>Admin Users Page</h1>
        {/* Add content for the admin users page here */}
      </div>
    </RoleProtectedRoute>
  )
}

export default AdminUsersPage
