import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"

const AdminUsersPage = async () => {
  const session = await getServerSession(authOptions)

  return (
    <div>
      <h1>Admin Users Page</h1>
      <p>This page is only accessible to admin users.</p>
      {session && <p>Welcome, {session.user?.name}!</p>}
    </div>
  )
}

export default AdminUsersPage
