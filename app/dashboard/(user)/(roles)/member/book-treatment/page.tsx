import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getBookingInitialData } from "@/actions/booking-actions"
import { getUserProfile } from "@/actions/profile-actions"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import type { UserSessionData } from "@/types/next-auth"

interface Props {
  params?: { lang?: string }
  searchParams?: { guestUserId?: string }
}

export default async function BookTreatmentPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions)
  const { guestUserId } = searchParams || {}
  
  let currentUserId: string
  let currentUser: UserSessionData
  
  if (guestUserId) {
    // Guest mode - get guest user data
    const guestProfile = await getUserProfile(guestUserId)
    if (!guestProfile) {
      return null
    }
    currentUserId = guestUserId
    currentUser = {
      id: guestProfile._id.toString(),
      name: guestProfile.name,
      email: guestProfile.email,
      roles: ["member"], // Treat guest as member for booking purposes
      phone: guestProfile.phone,
      gender: guestProfile.gender,
      dateOfBirth: guestProfile.dateOfBirth,
      address: guestProfile.address,
      emergencyContact: guestProfile.emergencyContact,
      healthInfo: guestProfile.healthInfo,
      preferences: guestProfile.preferences,
      isGuest: true
    }
  } else {
    // Regular logged-in user
    if (!session?.user?.id) {
      return null
    }
    currentUserId = session.user.id
    currentUser = session.user as UserSessionData
  }
  
  const initialDataResult = await getBookingInitialData(currentUserId)
  if (!initialDataResult?.success || !initialDataResult?.data) {
    return null
  }
  
  return (
    <BookingWizard
      initialData={initialDataResult.data}
      currentUser={currentUser}
      isGuestMode={!!guestUserId}
    />
  )
}
