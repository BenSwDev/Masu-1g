import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"

interface JWTPayload {
  responseId: string
  professionalId: string
  bookingId: string
  exp: number
}

export function verifyProfessionalToken(request: NextRequest): JWTPayload | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return decoded
  } catch (error) {
    return null
  }
} 