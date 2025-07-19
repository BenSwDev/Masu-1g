"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"

export function RoleSwitchDebug() {
  const { data: session } = useSession()
  const [isVisible, setIsVisible] = useState(false)

  if (!session?.user) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-500 text-white p-2 rounded"
      >
        Debug Role
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border p-4 rounded shadow-lg max-w-xs">
          <h3 className="font-bold mb-2">Session Debug Info:</h3>
          <div className="text-sm space-y-1">
            <div><strong>User ID:</strong> {session.user.id}</div>
            <div><strong>Roles:</strong> {session.user.roles?.join(", ")}</div>
            <div><strong>Active Role:</strong> {session.user.activeRole}</div>
            <div><strong>Email:</strong> {session.user.email}</div>
          </div>
        </div>
      )}
    </div>
  )
}