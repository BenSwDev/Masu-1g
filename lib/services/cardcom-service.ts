import { logger } from "@/lib/logs/logger"
import * as crypto from "crypto"

// Types for CARDCOM API
interface CardcomConfig {
  terminal: string
  apiToken: string
  baseUrl: string
  testMode: boolean
}

// Low Profile (iframe) payment request
interface LowProfileRequest {
  TerminalNumber: string
  APIKey: string
  Operation: 1 // תמיד 1 לחיוב
  Currency: 1 // תמיד 1 לשקלים
  Sum: number
  Description: string
  ReturnValue: string // מזהה התשלום שלנו
  SuccessRedirectUrl: string
  ErrorRedirectUrl: string
  CustomerName?: string
  CustomerEmail?: string
  CustomerPhone?: string
  Language: "he" // עברית
}

interface LowProfileResponse {
  ResponseCode: string // "0" = הצלחה
  Description: string
  url?: string // URL להפניה אם הצליח
  LowProfileCode?: string
}

// Direct transaction request
interface TransactionRequest {
  TerminalNumber: string
  APIKey: string
  Operation: 1 | 2 // 1 = חיוב, 2 = זיכוי
  Currency: 1
  Sum: number
  Description: string
  Token?: string // טוקן של כרטיס קיים
  CardNumber?: string // מספר כרטיס חדש
  CVV?: string
  ExpMonth?: string
  ExpYear?: string
  HolderName?: string
  HolderId?: string
  ReturnValue: string
  CreateToken?: boolean // ליצירת טוקן חדש
}

interface TransactionResponse {
  ResponseCode: string
  Description: string
  InternalDealNumber?: string
  TransactionID?: string
  Token?: string // טוקן חדש שנוצר
  Last4?: string
}

interface CardcomCallback {
  complete?: "1" | "0"
  token?: "1" | "0"
  sum?: string
  currency?: string
  ReturnValue?: string
  InternalDealNumber?: string
  Last4?: string
  Token?: string
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
  "11": "עסקה דחויה",
  "12": "תאריך תפוגה שגוי",
  "13": "CVV שגוי",
  "14": "שם בעל הכרטיס שגוי",
  "15": "מספר תעודת זהות שגוי"
}

class CardcomService {
  private config: CardcomConfig

  constructor() {
    this.config = {
      terminal: process.env.CARDCOM_TERMINAL || "125566",
      apiToken: process.env.CARDCOM_API_TOKEN || "Q3ZqTMTZGrSIKjktQrfN",  
      baseUrl: process.env.CARDCOM_BASE_URL || "https://secure.cardcom.solutions/api/v11",
      testMode: process.env.CARDCOM_TEST_MODE === "true",
    }
    
    // ✅ Log CARDCOM configuration for debugging
    logger.info("CARDCOM Service initialized", {
      terminal: this.config.terminal,
      hasApiToken: !!this.config.apiToken,
      baseUrl: this.config.baseUrl,
      testMode: this.config.testMode,
      environment: process.env.NODE_ENV
    })
  }

  /**
   * בדיקת הגדרות CARDCOM
   */
  private validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.terminal || !this.config.apiToken) {
      return {
        valid: false,
        error: "CARDCOM configuration missing - terminal and API token required"
      }
    }
    return { valid: true }
  }

  /**
   * יצירת תשלום Low Profile (iframe)
   */
  async createLowProfilePayment(params: {
    amount: number
    description: string
    paymentId: string
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    successUrl?: string
    errorUrl?: string
  }): Promise<{ success: boolean; data?: LowProfileResponse; error?: string }> {
    
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      // URLs לתוצאות תשלום - הפניה ל-callback API עם פרמטרים
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const callbackUrl = `${baseUrl}/api/payments/callback`
      const successUrl = params.successUrl || `${callbackUrl}?status=success&paymentId=${params.paymentId}`
      const errorUrl = params.errorUrl || `${callbackUrl}?status=error&paymentId=${params.paymentId}`
      
      const payload: LowProfileRequest = {
        TerminalNumber: this.config.terminal,
        APIKey: this.config.apiToken,
        Operation: 1,
        Currency: 1,
        Sum: params.amount,
        Description: params.description,
        ReturnValue: params.paymentId,
        SuccessRedirectUrl: successUrl,
        ErrorRedirectUrl: errorUrl,
        CustomerName: params.customerName,
        CustomerEmail: params.customerEmail,
        CustomerPhone: params.customerPhone,
        Language: "he"
      }

      logger.info("Creating CARDCOM Low Profile payment", {
        paymentId: params.paymentId,
        amount: params.amount,
        testMode: this.config.testMode,
        terminal: this.config.terminal,
        successUrl,
        errorUrl,
        baseUrl,
        description: params.description,
        customerName: params.customerName,
        customerEmail: params.customerEmail
      })

      const response = await this.sendRequest("LowProfile/Create", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM createLowProfilePayment error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בתקשורת עם שירות התשלומים" }
    }
  }

  /**
   * חיוב ישיר עם טוקן קיים
   */
  async chargeToken(params: {
    amount: number
    description: string
    token: string
    paymentId: string
    createNewToken?: boolean
  }): Promise<{ success: boolean; data?: TransactionResponse; error?: string }> {
    
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      const payload: TransactionRequest = {
        TerminalNumber: this.config.terminal,
        APIKey: this.config.apiToken,
        Operation: 1, // חיוב
        Currency: 1,
        Sum: params.amount,
        Description: params.description,
        Token: params.token,
        ReturnValue: params.paymentId,
        CreateToken: params.createNewToken || false
      }

      logger.info("CARDCOM token charge", {
        paymentId: params.paymentId,
        amount: params.amount,
        hasToken: !!params.token,
        testMode: this.config.testMode
      })

      const response = await this.sendRequest("Transactions/Transaction", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM chargeToken error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בחיוב עם טוקן" }
    }
  }

  /**
   * חיוב ישיר עם פרטי כרטיס אשראי
   */
  async chargeCard(params: {
    amount: number
    description: string
    cardNumber: string
    cvv: string
    expMonth: string
    expYear: string
    holderName: string
    holderId?: string
    paymentId: string
    createToken?: boolean
  }): Promise<{ success: boolean; data?: TransactionResponse; error?: string }> {
    
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      const payload: TransactionRequest = {
        TerminalNumber: this.config.terminal,
        APIKey: this.config.apiToken,
        Operation: 1, // חיוב
        Currency: 1,
        Sum: params.amount,
        Description: params.description,
        CardNumber: params.cardNumber,
        CVV: params.cvv,
        ExpMonth: params.expMonth,
        ExpYear: params.expYear,
        HolderName: params.holderName,
        HolderId: params.holderId,
        ReturnValue: params.paymentId,
        CreateToken: params.createToken || false
      }

      logger.info("CARDCOM card charge", {
        paymentId: params.paymentId,
        amount: params.amount,
        cardLast4: params.cardNumber.slice(-4),
        testMode: this.config.testMode
      })

      const response = await this.sendRequest("Transactions/Transaction", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM chargeCard error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בחיוב כרטיס אשראי" }
    }
  }

  /**
   * זיכוי/החזר
   */
  async refund(params: {
    amount: number
    description: string
    token: string
    paymentId: string
  }): Promise<{ success: boolean; data?: TransactionResponse; error?: string }> {
    
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      const payload: TransactionRequest = {
        TerminalNumber: this.config.terminal,
        APIKey: this.config.apiToken,
        Operation: 2, // זיכוי
        Currency: 1,
        Sum: params.amount,
        Description: params.description,
        Token: params.token,
        ReturnValue: params.paymentId,
      }

      logger.info("CARDCOM refund", {
        paymentId: params.paymentId,
        amount: params.amount,
        hasToken: !!params.token,
        testMode: this.config.testMode
      })

      const response = await this.sendRequest("Transactions/RefundByTransactionId", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM refund error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בביצוע החזר" }
    }
  }

  /**
   * שליחת בקשה ל-CARDCOM
   */
  private async sendRequest(endpoint: string, data: any): Promise<any> {
    // במצב בדיקה מחזירים תגובה מדומה, במצב ייצור משתמשים ב-API האמיתי
    if (this.config.testMode) {
      logger.info("CARDCOM TEST MODE - returning mock response", {
        endpoint,
        terminal: this.config.terminal,
        testMode: true,
      })
      
      return this.getMockResponse(endpoint, data)
    }

    const url = `${this.config.baseUrl}/${endpoint}`

    logger.info("Sending CARDCOM request", {
      url,
      endpoint,
      terminal: this.config.terminal,
      operation: data.Operation
    })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    })

    logger.info("CARDCOM API Response Status", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    logger.info("CARDCOM response received", {
      responseCode: result.ResponseCode,
      description: result.Description
    })
    
    return result
  }

  /**
   * תגובות מדומות למצב בדיקה
   */
  private getMockResponse(endpoint: string, data: any): any {
    const baseResponse = {
      ResponseCode: "0",
      Description: "הצלחה - מצב בדיקה",
    }

    const mockTransactionId = "TEST_" + Math.random().toString(36).substr(2, 9)
    const mockToken = "TOK_" + Math.random().toString(36).substr(2, 16)

    switch (endpoint) {
      case "LowProfile/Create":
        return {
          ...baseResponse,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback?status=success&paymentId=${data.ReturnValue}&complete=1&token=1&sum=${data.Sum}&mock=true&Token=${mockToken}&Last4=1234`,
          LowProfileCode: mockTransactionId,
        }

      case "Transactions/Transaction":
      case "Transactions/RefundByTransactionId":
        const transactionResponse: any = {
          ...baseResponse,
          InternalDealNumber: mockTransactionId,
          TransactionID: "TXN_" + mockTransactionId,
        }

        // אם נדרש ליצור טוקן, נוסיף אותו
        if (data.CreateToken || data.Token) {
          transactionResponse.Token = mockToken
          transactionResponse.Last4 = data.CardNumber ? data.CardNumber.slice(-4) : "1234"
        }

        return transactionResponse

      default:
        return baseResponse
    }
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
   * עיבוד callback מ-CARDCOM
   */
  processCallback(callbackData: CardcomCallback): {
    success: boolean
    paymentId?: string
    transactionId?: string
    token?: string
    last4?: string
    amount?: number
    error?: string
  } {
    try {
      // בדיקת השלמת התשלום
      if (callbackData.complete !== "1") {
        return {
          success: false,
          error: "התשלום לא הושלם בהצלחה"
        }
      }

      return {
        success: true,
        paymentId: callbackData.ReturnValue,
        transactionId: callbackData.InternalDealNumber,
        token: callbackData.Token,
        last4: callbackData.Last4,
        amount: callbackData.sum ? parseFloat(callbackData.sum) : undefined
      }
    } catch (error) {
      logger.error("Error processing CARDCOM callback", {
        error: error instanceof Error ? error.message : String(error),
        callbackData
      })

      return {
        success: false,
        error: "שגיאה בעיבוד תגובת התשלום"
      }
    }
  }

  /**
   * קבלת מצב הגדרות
   */
  getStatus() {
    return {
      configured: !!(this.config.terminal && this.config.apiToken),
      testMode: this.config.testMode,
      baseUrl: this.config.baseUrl,
      terminal: this.config.terminal.substring(0, 3) + "***", // הסתרת חלק מהטרמינל
    }
  }

  /**
   * מעבר בין מצב בדיקה לייצור
   */
  setTestMode(testMode: boolean) {
    this.config.testMode = testMode
    logger.info("CARDCOM test mode changed", { testMode })
  }

  /**
   * בדיקת חיבור ל-CARDCOM
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      // נבצע בקשת תשלום מדומה לבדיקת החיבור
      const testPayload: LowProfileRequest = {
        TerminalNumber: this.config.terminal,
        APIKey: this.config.apiToken,
        Operation: 1,
        Currency: 1,
        Sum: 1, // שקל אחד לבדיקה
        Description: "בדיקת חיבור",
        ReturnValue: "test_connection_" + Date.now(),
        SuccessRedirectUrl: "https://example.com/success",
        ErrorRedirectUrl: "https://example.com/error",
        Language: "he"
      }

      if (this.config.testMode) {
        // במצב בדיקה, רק נחזיר הצלחה
        return { success: true }
      }

      // בדיקת חיבור אמיתית
      const response = await this.sendRequest("LowProfile/Create", testPayload)
      
      if (response.ResponseCode === "0") {
        return { success: true }
      } else {
        return { 
          success: false, 
          error: CARDCOM_ERROR_CODES[response.ResponseCode] || response.Description 
        }
      }
    } catch (error) {
      return {
        success: false,
        error: "שגיאה בחיבור ל-CARDCOM: " + (error instanceof Error ? error.message : String(error))
      }
    }
  }

  /**
   * פענוח נתוני טוקן (לתשלומים ישירים)
   */
  decryptTokenData(tokenData: any): { token: string; last4: string } | null {
    try {
      // אם הטוקן כבר פענוח, החזר אותו
      if (tokenData && typeof tokenData === 'object' && tokenData.token) {
        return {
          token: tokenData.token,
          last4: tokenData.last4 || tokenData.Last4 || "****"
        }
      }
      
      // אם הטוקן הוא string, נסה לפענח אותו
      if (typeof tokenData === 'string') {
        return {
          token: tokenData,
          last4: "****"
        }
      }
      
      logger.error("Invalid token data format", { tokenData })
      return null
    } catch (error) {
      logger.error("Error decrypting token data", { error, tokenData })
      return null
    }
  }

  /**
   * חיוב ישיר עם טוקן (לתשלומים חוזרים)
   */
  async directCharge(params: {
    amount: number
    description: string
    token: string
    paymentId: string
  }): Promise<{ success: boolean; data?: TransactionResponse; error?: string }> {
    
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      const payload: TransactionRequest = {
        TerminalNumber: this.config.terminal,
        APIKey: this.config.apiToken,
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
        testMode: this.config.testMode
      })

      const response = await this.sendRequest("Transactions/Transaction", payload)
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
   * החזר ישיר עם טוקן
   */
  async directRefund(params: {
    amount: number
    description: string
    token: string
    paymentId: string
  }): Promise<{ success: boolean; data?: TransactionResponse; error?: string }> {
    
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      const payload: TransactionRequest = {
        TerminalNumber: this.config.terminal,
        APIKey: this.config.apiToken,
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
        testMode: this.config.testMode
      })

      const response = await this.sendRequest("Transactions/RefundByTransactionId", payload)
      return this.handleResponse(response)
    } catch (error) {
      logger.error("CARDCOM directRefund error", {
        error: error instanceof Error ? error.message : String(error),
        paymentId: params.paymentId,
      })
      return { success: false, error: "שגיאה בביצוע החזר ישיר" }
    }
  }
}

export const cardcomService = new CardcomService() 