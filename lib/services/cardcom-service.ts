import { logger } from "@/lib/logs/logger"
import * as crypto from "crypto"

// Types for CARDCOM API
interface CardcomConfig {
  terminal: string
  apiToken: string
  baseUrl: string
  testMode: boolean
}

// Document for creating invoice/receipt with payment
interface CardcomDocument {
  Name?: string // Customer name
  DocumentTypeToCreate?: "Order" | "Invoice" | "Receipt" // Type of document to create
  Email?: string // Email to send document to
  Products?: Array<{
    Description: string
    UnitCost: number
    Quantity?: number
  }>
}

// Low Profile (iframe) payment request
interface LowProfileRequest {
  TerminalNumber: number // Integer as required by CARDCOM
  ApiName: string // Correct field name per CARDCOM API
  Operation?: "ChargeOnly" // Default operation type
  Amount: number // CARDCOM expects "Amount" not "Sum"
  ReturnValue: string // מזהה התשלום שלנו
  SuccessRedirectUrl: string
  FailedRedirectUrl: string // CARDCOM expects "FailedRedirectUrl" not "ErrorRedirectUrl"
  WebHookUrl: string // Required field for callbacks
  ProductName?: string // Optional product description
  CustomerName?: string
  CustomerEmail?: string
  CustomerPhone?: string
  Language?: "he" // עברית
  Document?: CardcomDocument // Optional document creation
}

interface LowProfileResponse {
  ResponseCode: string // "0" = הצלחה
  Description: string
  Url?: string // URL להפניה אם הצליח (עם U גדולה!)
  LowProfileId?: string // מזהה התשלום
  UrlToPayPal?: string
  UrlToBit?: string
  url?: string // Legacy field (עם u קטנה)
  LowProfileCode?: string // Legacy field
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
      testMode: process.env.CARDCOM_TEST_MODE === "true"
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
    createDocument?: boolean // האם ליצור מסמך (חשבונית)
    documentType?: "Order" | "Invoice" | "Receipt" // סוג המסמך
    drawerMode?: boolean // האם להשתמש במצב drawer
  }): Promise<{ success: boolean; data?: LowProfileResponse; error?: string }> {
    
    const configCheck = this.validateConfig()
    if (!configCheck.valid) {
      return { success: false, error: configCheck.error }
    }

    try {
      // URLs לתוצאות תשלום - הפניה לעמוד שמטפל ב-drawer communication
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL
      const callbackUrl = `${baseUrl}/api/payments/callback`
      const drawerParam = params.drawerMode ? "&drawer=true" : ""
      // שינוי: Success URL מפנה לעמוד שמתקשר עם drawer
      const successUrl = params.successUrl || `${baseUrl}/payment/success?paymentId=${params.paymentId}${drawerParam}`
      const errorUrl = params.errorUrl || `${baseUrl}/payment/success?paymentId=${params.paymentId}&error=true${drawerParam}`
      
      const payload: LowProfileRequest = {
        TerminalNumber: parseInt(this.config.terminal),
        ApiName: this.config.apiToken,
        Operation: "ChargeOnly",
        Amount: params.amount,
        ProductName: params.description,
        ReturnValue: params.paymentId,
        SuccessRedirectUrl: successUrl,
        FailedRedirectUrl: errorUrl,
        WebHookUrl: callbackUrl, // Required callback URL
        CustomerName: params.customerName,
        CustomerEmail: params.customerEmail,
        CustomerPhone: params.customerPhone,
        Language: "he"
      }

      // הוספת מסמך אם נדרש
      if (params.createDocument) {
        payload.Document = {
          Name: params.customerName || "לקוח",
          DocumentTypeToCreate: params.documentType || "Receipt",
          // רק אם יש אימייל - נשלח מייל
          ...(params.customerEmail && { Email: params.customerEmail }),
          Products: [{
            Description: params.description,
            UnitCost: params.amount,
            Quantity: 1
          }]
        }
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
        createDocument: params.createDocument,
        documentType: params.documentType,
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
    const url = `${this.config.baseUrl}/${endpoint}`

    logger.info("Sending CARDCOM request", {
      url,
      endpoint,
      terminal: this.config.terminal,
      operation: data.Operation,
      testMode: this.config.testMode,
      hasEmail: !!(data.Document && data.Document.Email)
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
      url,
      testMode: this.config.testMode
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    logger.info("CARDCOM response received", {
      responseCode: result.ResponseCode,
      description: result.Description,
      hasUrl: !!result.Url,
      testMode: this.config.testMode
    })
    
    return result
  }

  /**
   * עיבוד תגובה מ-CARDCOM
   */
  private handleResponse(response: any): { success: boolean; data?: any; error?: string } {
    if (response.ResponseCode === "0" || response.ResponseCode === 0) {
      // נוודא שנחזיר את ה-URL בשדה הנכון (url עם u קטנה) לתאימות לאחור
      const processedResponse = {
        ...response,
        url: response.Url || response.url, // משתמשים ב-Url (עם U גדולה) מCARDCOM
        LowProfileCode: response.LowProfileId || response.LowProfileCode // תמיכה בשני השמות
      }
      
      return { success: true, data: processedResponse }
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
        TerminalNumber: parseInt(this.config.terminal),
        ApiName: this.config.apiToken,
        Operation: "ChargeOnly",
        Amount: 1, // שקל אחד לבדיקה
        ProductName: "בדיקת חיבור",
        ReturnValue: "test_connection_" + Date.now(),
        SuccessRedirectUrl: "https://example.com/success",
        FailedRedirectUrl: "https://example.com/error",
        WebHookUrl: "https://example.com/webhook",
        Language: "he"
      }

      if (this.config.testMode) {
        // במצב בדיקה, רק נחזיר הצלחה
        return { success: true }
      }

      // בדיקת חיבור אמיתית
      const response = await this.sendRequest("LowProfile/Create", testPayload)
      
      if (response.ResponseCode === "0" || response.ResponseCode === 0) {
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