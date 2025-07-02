import { logger } from "@/lib/logs/logger"
import * as crypto from "crypto"

// Types for CARDCOM API
export interface CardcomConfig {
  terminalNumber: string
  username: string
  apiKey: string
  baseUrl: string
  testMode: boolean
}

export interface CreatePaymentRequest {
  TerminalNumber: string
  UserName: string
  APIKey: string
  Operation: 1 // תמיד 1 לחיוב
  Currency: 1 // תמיד 1 לשקלים
  Sum: number
  Description: string
  ReturnValue: string // מזהה התשלום שלנו
  CreateToken: true // תמיד true ליצירת טוקן
  SuccessRedirectUrl: string
  ErrorRedirectUrl: string
  CustomerName?: string
  CustomerEmail?: string
  CustomerPhone?: string
}

export interface CreatePaymentResponse {
  ResponseCode: string // "0" = הצלחה
  Description: string
  url?: string // URL להפניה אם הצליח
  LowProfileCode?: string
}

export interface DirectChargeRequest {
  TerminalNumber: string
  UserName: string
  APIKey: string
  Operation: 1 | 2 // 1 = חיוב, 2 = זיכוי
  Currency: 1
  Sum: number
  Description: string
  Token: string
  ReturnValue: string
}

export interface DirectChargeResponse {
  ResponseCode: string
  Description: string
  InternalDealNumber?: string
  TransactionID?: string
}

export interface TokenData {
  token: string
  last4: string
  name: string
  phone: string
  email: string
}

export interface CardcomCallback {
  complete?: "1" | "0"
  token?: "1" | "0"
  sum?: string
  currency?: string
  ReturnValue?: string
  InternalDealNumber?: string
  last4?: string
  tokenData?: string // JSON מוצפן
}

// קודי שגיאה של CARDCOM
const CARDCOM_ERROR_CODES: Record<string, string> = {
  "0": "הצלחה",
  "1": "שגיאה כללית",
  "2": "פרמטר חסר או שגוי",
  "3": "בעיה באימות",
  "4": "טוקן לא תקף",
  "5": "סכום לא תקף",
  "6": "מטבע לא נתמך",
  "7": "תקלה בתקשורת עם הבנק",
  "8": "כרטיס אשראי לא תקף",
  "9": "אין מספיק כסף בכרטיס",
  "10": "כרטיס חסום",
}

export class CardcomService {
  private config: CardcomConfig

  constructor() {
    this.config = {
      terminalNumber: process.env.CARDCOM_TERMINAL_NUMBER || "",
      username: process.env.CARDCOM_USERNAME || "",
      apiKey: process.env.CARDCOM_API_KEY || "",
      baseUrl: process.env.CARDCOM_BASE_URL || "https://secure.cardcom.solutions/api/v11",
      testMode: process.env.CARDCOM_TEST_MODE === "true",
    }

    // הגדרות יאומתו בזמן השימוש בפונקציות
  }

  /**
   * בדיקת הגדרות CARDCOM
   */
  private validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.terminalNumber || !this.config.username || !this.config.apiKey) {
      return {
        valid: false,
        error: "CARDCOM configuration missing - please check environment variables"
      }
    }
    return { valid: true }
  }

  /**
   * יצירת תשלום חדש ב-CARDCOM
   */
  async createPayment(params: {
    amount: number
    description: string
    paymentId: string
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    resultUrl?: string
  }): Promise<{ success: boolean; data?: CreatePaymentResponse; error?: string }> {
    // בדיקת הגדרות
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      // URL אחיד לתוצאות תשלום
      const resultUrl = params.resultUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/result`
      
      const payload: CreatePaymentRequest = {
        TerminalNumber: this.config.terminalNumber,
        UserName: this.config.username,
        APIKey: this.config.apiKey,
        Operation: 1,
        Currency: 1,
        Sum: params.amount,
        Description: params.description,
        ReturnValue: params.paymentId,
        CreateToken: true,
        SuccessRedirectUrl: resultUrl,
        ErrorRedirectUrl: resultUrl,
        CustomerName: params.customerName,
        CustomerEmail: params.customerEmail,
        CustomerPhone: params.customerPhone,
      }

      logger.info("Creating CARDCOM payment", {
        paymentId: params.paymentId,
        amount: params.amount,
        testMode: this.config.testMode,
      })

      const response = await this.sendRequest("LowProfile", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM createPayment error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בתקשורת עם שירות התשלומים" }
    }
  }

  /**
   * חיוב ישיר עם טוקן
   */
  async directCharge(params: {
    amount: number
    description: string
    token: string
    paymentId: string
  }): Promise<{ success: boolean; data?: DirectChargeResponse; error?: string }> {
    // בדיקת הגדרות
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      const payload: DirectChargeRequest = {
        TerminalNumber: this.config.terminalNumber,
        UserName: this.config.username,
        APIKey: this.config.apiKey,
        Operation: 1, // חיוב
        Currency: 1,
        Sum: params.amount,
        Description: params.description,
        Token: params.token,
        ReturnValue: params.paymentId,
      }

      logger.info("CARDCOM direct charge", {
        paymentId: params.paymentId,
        amount: params.amount,
        hasToken: !!params.token,
      })

      const response = await this.sendRequest("Charge", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM directCharge error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בחיוב ישיר" }
    }
  }

  /**
   * זיכוי ישיר עם טוקן
   */
  async directRefund(params: {
    amount: number
    description: string
    token: string
    paymentId: string
  }): Promise<{ success: boolean; data?: DirectChargeResponse; error?: string }> {
    // בדיקת הגדרות
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      const payload: DirectChargeRequest = {
        TerminalNumber: this.config.terminalNumber,
        UserName: this.config.username,
        APIKey: this.config.apiKey,
        Operation: 2, // זיכוי
        Currency: 1,
        Sum: params.amount,
        Description: params.description,
        Token: params.token,
        ReturnValue: params.paymentId,
      }

      logger.info("CARDCOM direct refund", {
        paymentId: params.paymentId,
        amount: params.amount,
        hasToken: !!params.token,
      })

      const response = await this.sendRequest("Charge", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM directRefund error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בזיכוי" }
    }
  }

  /**
   * שליחת בקשה ל-CARDCOM
   */
  private async sendRequest(endpoint: string, data: any): Promise<any> {
    const url = `${this.config.baseUrl}/${endpoint}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  }

  /**
   * עיבוד תגובה מ-CARDCOM
   */
  private handleResponse(response: any): { success: boolean; data?: any; error?: string } {
    if (response.ResponseCode === "0") {
      return { success: true, data: response }
    } else {
      const errorMessage =
        CARDCOM_ERROR_CODES[response.ResponseCode] || response.Description || "שגיאה לא ידועה"

      logger.error("CARDCOM API Error", {
        code: response.ResponseCode,
        description: response.Description,
        errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * הצפנת נתוני טוקן
   */
  encryptTokenData(tokenData: TokenData): string {
    const algorithm = "aes-256-gcm"
    const key = Buffer.from(process.env.CARDCOM_ENCRYPTION_KEY || "", "utf8").slice(0, 32)

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    cipher.setAAD(Buffer.from("cardcom-token"))

    let encrypted = cipher.update(JSON.stringify(tokenData), "utf8", "hex")
    encrypted += cipher.final("hex")

    const authTag = cipher.getAuthTag()

    return JSON.stringify({
      iv: iv.toString("hex"),
      data: encrypted,
      authTag: authTag.toString("hex"),
    })
  }

  /**
   * פענוח נתוני טוקן
   */
  decryptTokenData(encryptedData: string): TokenData | null {
    try {
      const { iv, data, authTag } = JSON.parse(encryptedData)
      const algorithm = "aes-256-gcm"
      const key = Buffer.from(process.env.CARDCOM_ENCRYPTION_KEY || "", "utf8").slice(0, 32)

      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, "hex"))
      decipher.setAAD(Buffer.from("cardcom-token"))
      decipher.setAuthTag(Buffer.from(authTag, "hex"))

      let decrypted = decipher.update(data, "hex", "utf8")
      decrypted += decipher.final("utf8")

      return JSON.parse(decrypted)
    } catch (error) {
      logger.error("Failed to decrypt token data", { error })
      return null
    }
  }

  /**
   * בדיקת סטטוס השירות
   */
  getStatus() {
    return {
      configured: !!(this.config.terminalNumber && this.config.username && this.config.apiKey),
      testMode: this.config.testMode,
      baseUrl: this.config.baseUrl,
    }
  }
}

export const cardcomService = new CardcomService() 