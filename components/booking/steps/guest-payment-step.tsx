"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/translations/i18n";
import { usePaymentModal } from "@/hooks/use-payment-modal";
import { updateBookingStatusAfterPayment } from "@/actions/booking-actions";
import { Button } from "@/components/common/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/ui/card";
import { Separator } from "@/components/common/ui/separator";
import { Badge } from "@/components/common/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog";
import { Alert, AlertDescription } from "@/components/common/ui/alert";
import { Checkbox } from "@/components/common/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select";
import {
  Loader2,
  CreditCard,
  CheckCircle,
  XCircle,
  Tag,
  AlertTriangle,
  Info,
  Bell,
  Mail,
  MessageSquare,
  Globe,
} from "lucide-react";
import type { CalculatedPriceDetails } from "@/types/booking";

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: Date;
  gender?: "male" | "female" | "other";
  notes?: string;
  isBookingForSomeoneElse?: boolean;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientBirthDate?: Date;
  recipientGender?: "male" | "female" | "other";
  // Notification preferences (moved to Step 6)
  bookerNotificationMethod?: "email" | "sms" | "both";
  bookerNotificationLanguage?: "he" | "en" | "ru";
  recipientNotificationMethod?: "email" | "sms" | "both";
  recipientNotificationLanguage?: "he" | "en" | "ru";
  
  // ➕ Enhanced Consents (Step 6)
  customerAlerts?: "sms" | "email" | "none";
  patientAlerts?: "sms" | "email" | "none";
  marketingOptIn?: boolean;
  termsAccepted?: boolean;
}

interface GuestPaymentStepProps {
  calculatedPrice: CalculatedPriceDetails | null;
  guestInfo: Partial<GuestInfo>;
  setGuestInfo: (info: Partial<GuestInfo>) => void;
  onConfirm: () => void;
  onPrev: () => void;
  isLoading: boolean;
  createPendingBooking?: () => Promise<string | null>;
  pendingBookingId?: string | null;
  isRedeeming?: boolean;
}

export function GuestPaymentStep({
  calculatedPrice,
  guestInfo,
  setGuestInfo,
  onConfirm,
  onPrev,
  isLoading,
  createPendingBooking,
  pendingBookingId = null,
  isRedeeming = false,
}: GuestPaymentStepProps) {
  const { t, dir } = useTranslation();
  const {
    showPaymentModal,
    paymentStatus,
    countdown,
    isCountingDown,
    openModal,
    handlePaymentSuccess,
    handlePaymentFailure,
    handleTryAgain,
    handleOpenChange,
  } = usePaymentModal({ 
    onSuccess: async () => {
      // Create pending booking if not already created
      if (createPendingBooking && !pendingBookingId) {
        const bookingId = await createPendingBooking();
        if (!bookingId) {
          // Error creating booking - createPendingBooking already shows error toast
          return;
        }
      }
      
      // ✅ Process payment through centralized system with enhanced data
      const processingResult = await updateBookingStatusAfterPayment(
        pendingBookingId || "current-booking-id",
        "success",
        `TXN-${Date.now()}`, // Demo transaction ID
        "1234", // Demo card last 4 digits
        calculatedPrice?.finalAmount || 0
      );
      
      if (processingResult.success) {
        // Execute the actual booking confirmation
        onConfirm();
      } else {
        // Handle processing error
        console.error("Payment processing failed:", processingResult.error);
      }
    }
  });
  // ➕ Enhanced Consents State
  const [marketingConsent, setMarketingConsent] = useState(guestInfo.marketingOptIn ?? true);
  const [termsAccepted, setTermsAccepted] = useState(guestInfo.termsAccepted ?? true);
  const [customerAlerts, setCustomerAlerts] = useState<"sms" | "email" | "none">(
    guestInfo.customerAlerts || "email"
  );
  const [patientAlerts, setPatientAlerts] = useState<"sms" | "email" | "none">(
    guestInfo.patientAlerts || "email"
  );

  // Notification preferences state
  const [bookerNotificationMethod, setBookerNotificationMethod] = useState<
    "email" | "sms" | "both"
  >(guestInfo.bookerNotificationMethod || "email");
  const [bookerNotificationLanguage, setBookerNotificationLanguage] = useState<
    "he" | "en" | "ru"
  >(guestInfo.bookerNotificationLanguage || "he");
  const [recipientNotificationMethod, setRecipientNotificationMethod] =
    useState<"email" | "sms" | "both">(
      guestInfo.recipientNotificationMethod || "email",
    );
  const [recipientNotificationLanguage, setRecipientNotificationLanguage] =
    useState<"he" | "en" | "ru">(
      guestInfo.recipientNotificationLanguage || "he",
    );

  // ➕ Update guest info when preferences and consents change
  useEffect(() => {
    setGuestInfo({
      ...guestInfo,
      bookerNotificationMethod,
      bookerNotificationLanguage,
      recipientNotificationMethod,
      recipientNotificationLanguage,
      // Enhanced consents
      customerAlerts,
      patientAlerts,
      marketingOptIn: marketingConsent,
      termsAccepted,
    });
  }, [
    bookerNotificationMethod,
    bookerNotificationLanguage,
    recipientNotificationMethod,
    recipientNotificationLanguage,
    customerAlerts,
    patientAlerts,
    marketingConsent,
    termsAccepted,
  ]);


  const formatPrice = (amount: number) => {
    return `₪${amount.toFixed(2)}`;
  };

  const handlePayNow = async () => {
    if (isCountingDown || !termsAccepted) return;

    // Only open the payment modal - don't create booking or execute any other actions
    openModal();
  };

  if (!calculatedPrice || (calculatedPrice.finalAmount === 0 && calculatedPrice.isFullyCoveredByVoucherOrSubscription)) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.payment.confirmTitleNoPayment")}</h2>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            {t("bookings.steps.payment.confirmDescNoPayment")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button variant="outline" onClick={onPrev} disabled={isLoading} type="button" size="lg">
            {t("common.back")}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} type="button" size="lg">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("bookings.steps.payment.confirmBooking")}
          </Button>
        </div>
      </div>
    )
  }



  // Regular payment flow with full interface
  return (
    <>
      <div className="space-y-6" dir={dir}>
        <div className="text-center">
          <CreditCard className="mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-2xl font-semibold tracking-tight">{t("bookings.steps.payment.title")}</h2>
          <p className="text-muted-foreground mt-2">
            {t("bookings.steps.payment.description")}
          </p>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              סיכום הזמנה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Base Price */}
              <div className="flex justify-between">
                <span>מחיר בסיס:</span>
                <span>{formatPrice(calculatedPrice.basePrice)}</span>
              </div>

              {/* Surcharges */}
              {calculatedPrice.surcharges &&
                calculatedPrice.surcharges.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-orange-700">
                      תוספות מחיר:
                    </div>
                    {calculatedPrice.surcharges.map((surcharge, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-orange-600 text-sm pr-4"
                      >
                        <span>• {surcharge.description || "תוספת מחיר"}:</span>
                        <span>+{formatPrice(surcharge.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-orange-600 font-medium border-t pt-2">
                      <span>סה"כ תוספות:</span>
                      <span>
                        +{formatPrice(calculatedPrice.totalSurchargesAmount)}
                      </span>
                    </div>
                  </div>
                )}

              {/* After subscription/voucher coverage */}
              {(calculatedPrice.isBaseTreatmentCoveredBySubscription ||
                calculatedPrice.isBaseTreatmentCoveredByTreatmentVoucher) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-green-600">
                    <span>
                      {calculatedPrice.isBaseTreatmentCoveredBySubscription
                        ? "כוסה על ידי מנוי:"
                        : "כוסה על ידי שובר טיפול:"}
                    </span>
                    <span>-{formatPrice(calculatedPrice.basePrice)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>מחיר לאחר כיסוי מנוי/שובר:</span>
                    <span>
                      {formatPrice(
                        calculatedPrice.treatmentPriceAfterSubscriptionOrTreatmentVoucher,
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Gift voucher application */}
              {calculatedPrice.voucherAppliedAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    שובר מתנה:
                  </span>
                  <span>
                    -{formatPrice(calculatedPrice.voucherAppliedAmount)}
                  </span>
                </div>
              )}

              {/* Coupon discount */}
              {calculatedPrice.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    הנחת קופון:
                  </span>
                  <span>-{formatPrice(calculatedPrice.couponDiscount)}</span>
                </div>
              )}

              <Separator />

              {/* Final Amount */}
              <div className="flex justify-between text-xl font-bold">
                <span>סכום לתשלום:</span>
                <span className="text-primary">
                  {formatPrice(calculatedPrice.finalAmount)}
                </span>
              </div>

              {calculatedPrice.isFullyCoveredByVoucherOrSubscription && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ההזמנה מכוסה במלואה על ידי מנוי או שובר
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              העדפות התראות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booker Notification Preferences */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                התראות עבור המזמין ({guestInfo.firstName} {guestInfo.lastName})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">אמצעי התראה:</label>
                  <Select
                    value={bookerNotificationMethod}
                    onValueChange={(value: "email" | "sms" | "both") =>
                      setBookerNotificationMethod(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          אימייל בלבד
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          SMS בלבד
                        </div>
                      </SelectItem>
                      <SelectItem value="both">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          אימייל + SMS
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">שפת ההתראה:</label>
                  <Select
                    value={bookerNotificationLanguage}
                    onValueChange={(value: "he" | "en" | "ru") =>
                      setBookerNotificationLanguage(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="he">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          עברית
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          English
                        </div>
                      </SelectItem>
                      <SelectItem value="ru">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Русский
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Recipient Notification Preferences (only if booking for someone else) */}
            {guestInfo.isBookingForSomeoneElse && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  התראות עבור מקבל הטיפול ({guestInfo.recipientFirstName}{" "}
                  {guestInfo.recipientLastName})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">אמצעי התראה:</label>
                    <Select
                      value={recipientNotificationMethod}
                      onValueChange={(value: "email" | "sms" | "both") =>
                        setRecipientNotificationMethod(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            אימייל בלבד
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            SMS בלבד
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            אימייל + SMS
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">שפת ההתראה:</label>
                    <Select
                      value={recipientNotificationLanguage}
                      onValueChange={(value: "he" | "en" | "ru") =>
                        setRecipientNotificationLanguage(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="he">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            עברית
                          </div>
                        </SelectItem>
                        <SelectItem value="en">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            English
                          </div>
                        </SelectItem>
                        <SelectItem value="ru">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Русский
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Policy and Consent Checkboxes */}
        <Card>
          <CardContent className="pt-6">
            {/* Cancellation Policy */}
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm leading-relaxed">
                <div className="space-y-2">
                  <div className="font-medium">מדיניות ביטול:</div>
                  <div>
                    • ביטול הזמנה מרגע ביצועה יחוייב בדמי ביטול של 5% מסכום
                    ההזמנה.
                  </div>
                  <div>
                    • ביטול הזמנה פחות מ 24 שעות ממועד הטיפול יחוייב בדמי ביטול
                    של 50% מסכום ההזמנה.
                  </div>
                  <div>
                    • ביטול הזמנה פחות מ 4 שעות ממועד הטיפול יחוייב בדמי ביטול
                    מלאים של 100%.
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* ➕ Enhanced Consents and Preferences */}
            <div className="space-y-6">
              {/* Customer (Booker) Alert Preferences */}
              <div className="space-y-3">
                <div className="font-medium text-sm">העדפות התראות למזמין</div>
                <Select value={customerAlerts} onValueChange={(value: "sms" | "email" | "none") => setCustomerAlerts(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        דואר אלקטרוני
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </div>
                    </SelectItem>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        ללא התראות
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Patient Alert Preferences (if booking for someone else) */}
              {guestInfo.isBookingForSomeoneElse && (
                <div className="space-y-3">
                  <div className="font-medium text-sm">העדפות התראות למטופל</div>
                  <Select value={patientAlerts} onValueChange={(value: "sms" | "email" | "none") => setPatientAlerts(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          דואר אלקטרוני
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          SMS
                        </div>
                      </SelectItem>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          ללא התראות
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              {/* Consent Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <Checkbox
                    id="marketing-consent"
                    checked={marketingConsent}
                    onCheckedChange={(checked) =>
                      setMarketingConsent(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="marketing-consent"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    אני מאשר/ת קבלת דיוור של חומרים פרסומיים, הצעות ישווקיות
                    ועדכונים באמצעי המדיה השונים, לרבות בדואר אלקטרוני SMS ו/או
                    שיחה טלפונית
                  </label>
                </div>

                <div className="flex items-start space-x-3 space-x-reverse">
                  <Checkbox
                    id="terms-accepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) =>
                      setTermsAccepted(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="terms-accepted"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    בביצוע ההזמנה אני מאשר את הסכמתי לתנאי השימוש ומדיניות הפרטיות
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                </div>

                {!termsAccepted && (
                  <div className="text-red-500 text-sm">
                    יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev} disabled={isLoading}>
            חזור
          </Button>
          <Button
            onClick={handlePayNow}
            disabled={isLoading || isCountingDown || !termsAccepted}
            size="lg"
            className="px-8"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCountingDown
              ? `נסה שוב בעוד ${countdown} שניות`
              : `שלם כעת ${formatPrice(calculatedPrice.finalAmount)}`}
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">תשלום מאובטח</DialogTitle>
          </DialogHeader>

          <div className="space-y-6" dir={dir}>
            {paymentStatus === "pending" && (
              <>
                {/* ➕ Enhanced CardComm iframe simulation with demo data */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {t("bookings.payment.iframe.title")}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t("bookings.payment.iframe.description")}
                  </p>
                  
                  {/* ➕ Demo payment form */}
                  <div className="mt-4 p-4 bg-white border rounded space-y-3">
                    <div className="text-sm text-gray-600 mb-3">
                      {t("bookings.payment.amount")}: {" "}
                      <span className="font-bold">
                        {formatPrice(calculatedPrice.finalAmount)}
                      </span>
                    </div>
                    
                    {/* ➕ Demo transaction details */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Transaction ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
                      <div>Terminal: {Math.floor(Math.random() * 9000) + 1000}</div>
                      <div>Card Last 4: ****{Math.floor(Math.random() * 9000) + 1000}</div>
                      <div>Provider: CardCom Demo</div>
                    </div>
                  </div>
                </div>

                {/* Demo buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handlePaymentSuccess}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t("bookings.payment.demo.success")}
                  </Button>
                  <Button onClick={handlePaymentFailure} variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    {t("bookings.payment.demo.failure")}
                  </Button>
                </div>
              </>
            )}

            {paymentStatus === "success" && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-green-700 mb-2">
                  {t("bookings.payment.success.title")}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t("bookings.payment.success.description")}
                </p>
                {/* ➕ Demo success details */}
                <div className="text-xs text-gray-500 space-y-1 max-w-sm mx-auto">
                  <div>✓ {t("bookings.payment.success.email")}</div>
                  <div>✓ {t("bookings.payment.success.sms")}</div>
                  <div>✓ {t("bookings.payment.success.professionals")}</div>
                </div>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="text-center py-8">
                <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
                <h3 className="text-xl font-semibold text-red-700 mb-2">
                  {t("bookings.payment.failure.title")}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t("bookings.payment.failure.description")}
                </p>

                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t("bookings.payment.failure.noCharge")}
                  </AlertDescription>
                </Alert>

                <Button onClick={handleTryAgain} className="w-full">
                  {t("bookings.payment.failure.retry")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
