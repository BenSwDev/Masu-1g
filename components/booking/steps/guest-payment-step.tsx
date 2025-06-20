"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/translations/i18n";
import { usePaymentModal } from "@/hooks/use-payment-modal";
import { updateBookingStatusAfterPayment } from "@/actions/booking-actions";
import { useSession } from "next-auth/react";
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
  
  // Simplified notification preferences
  customerAlerts?: "sms" | "email" | "both";
  patientAlerts?: "sms" | "email" | "both";
  notificationLanguage?: "he" | "en" | "ru";
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
  const { t, dir, language } = useTranslation();
  const { data: session } = useSession();
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

  // Enhanced Consents State with proper defaults
  const [marketingConsent, setMarketingConsent] = useState(guestInfo.marketingOptIn ?? true);
  const [termsAccepted, setTermsAccepted] = useState(guestInfo.termsAccepted ?? true);
  
  // Default notification preferences - for logged-in users use their preferences, for guests use both+hebrew
  const getDefaultCustomerAlerts = () => {
    if (session?.user?.notificationPreferences?.methods) {
      const methods = session.user.notificationPreferences.methods;
      if (methods.includes("email") && methods.includes("sms")) return "both";
      if (methods.includes("sms")) return "sms";
      return "email";
    }
    return "both"; // Default for guests
  };

  const getDefaultLanguage = () => {
    return session?.user?.notificationPreferences?.language || "he";
  };

  const [customerAlerts, setCustomerAlerts] = useState<"sms" | "email" | "both">(
    guestInfo.customerAlerts || getDefaultCustomerAlerts()
  );
  const [patientAlerts, setPatientAlerts] = useState<"sms" | "email" | "both">(
    guestInfo.patientAlerts || getDefaultCustomerAlerts()
  );
  const [notificationLanguage, setNotificationLanguage] = useState<"he" | "en" | "ru">(
    guestInfo.notificationLanguage || getDefaultLanguage()
  );

  // Update guest info when preferences and consents change
  useEffect(() => {
    setGuestInfo({
      ...guestInfo,
      customerAlerts,
      patientAlerts,
      notificationLanguage,
      marketingOptIn: marketingConsent,
      termsAccepted,
    });
  }, [
    customerAlerts,
    patientAlerts,
    notificationLanguage,
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
      <div className="max-w-4xl mx-auto space-y-6" dir={dir} lang={language}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
              <div>
                <h3 className="text-xl font-semibold text-green-700 mb-2">
                  {t("bookings.payment.voucher.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("bookings.payment.voucher.description")}
                </p>
              </div>
              <Button onClick={onConfirm} size="lg" className="px-8">
                {t("bookings.payment.voucher.confirm")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6" dir={dir} lang={language}>
        {/* Price Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t("bookings.payment.summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base Price */}
            <div className="flex justify-between items-center">
              <span>{t("bookings.payment.basePrice")}:</span>
              <span>{formatPrice(calculatedPrice.basePrice)}</span>
            </div>

            {/* Surcharges */}
            {calculatedPrice.surcharges && calculatedPrice.surcharges.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">{t("bookings.payment.surcharges")}:</h4>
                  {calculatedPrice.surcharges.map((surcharge, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{surcharge.description}</span>
                      <span>+{formatPrice(surcharge.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Discounts */}
            {(calculatedPrice.couponDiscount > 0 || calculatedPrice.voucherAppliedAmount > 0) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-green-600">{t("bookings.payment.discounts")}:</h4>
                  {calculatedPrice.couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t("bookings.payment.discount")}</span>
                      <span className="text-green-600">-{formatPrice(calculatedPrice.couponDiscount)}</span>
                    </div>
                  )}
                  {calculatedPrice.voucherAppliedAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{t("bookings.payment.voucher")}</span>
                      <span className="text-green-600">-{formatPrice(calculatedPrice.voucherAppliedAmount)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Final Amount */}
            <Separator />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>{t("bookings.payment.total")}:</span>
              <span className="text-2xl">{formatPrice(calculatedPrice.finalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences - Under Amount */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              העדפות התראות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer/Booker Alert Preferences */}
            <div className="space-y-3">
              <div className="font-medium text-sm">העדפות התראות למזמין ({guestInfo.firstName})</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={customerAlerts === "email" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCustomerAlerts("email")}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  דואר אלקטרוני
                </Button>
                <Button
                  type="button"
                  variant={customerAlerts === "sms" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCustomerAlerts("sms")}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </Button>
                <Button
                  type="button"
                  variant={customerAlerts === "both" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCustomerAlerts("both")}
                  className="flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  שניהם
                </Button>
              </div>
            </div>

            {/* Patient Alert Preferences (if booking for someone else) */}
            {guestInfo.isBookingForSomeoneElse && (
              <div className="space-y-3">
                <div className="font-medium text-sm">העדפות התראות למטופל ({guestInfo.recipientFirstName})</div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={patientAlerts === "email" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPatientAlerts("email")}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    דואר אלקטרוני
                  </Button>
                  <Button
                    type="button"
                    variant={patientAlerts === "sms" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPatientAlerts("sms")}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    SMS
                  </Button>
                  <Button
                    type="button"
                    variant={patientAlerts === "both" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPatientAlerts("both")}
                    className="flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    שניהם
                  </Button>
                </div>
              </div>
            )}

            {/* Notification Language */}
            <div className="space-y-3">
              <div className="font-medium text-sm">שפת ההתראות</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={notificationLanguage === "he" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotificationLanguage("he")}
                >
                  עברית
                </Button>
                <Button
                  type="button"
                  variant={notificationLanguage === "en" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotificationLanguage("en")}
                >
                  English
                </Button>
                <Button
                  type="button"
                  variant={notificationLanguage === "ru" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotificationLanguage("ru")}
                >
                  Русский
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketing Consent */}
        <Card>
          <CardContent className="pt-6">
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

        {/* Terms and Cancellation Policy */}
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

            {/* Terms Acceptance */}
            <div className="space-y-4">
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
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">תשלום מאובטח</DialogTitle>
          </DialogHeader>

          <div className="space-y-6" dir={dir} lang={language}>
            {paymentStatus === "pending" && (
              <>
                {/* Enhanced CardComm iframe simulation with demo data */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {t("bookings.payment.iframe.title")}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {t("bookings.payment.iframe.description")}
                  </p>
                  
                  {/* Demo payment form */}
                  <div className="mt-4 p-4 bg-white border rounded space-y-3">
                    <div className="text-sm text-gray-600 mb-3">
                      {t("bookings.payment.amount")}: {" "}
                      <span className="font-bold">
                        {formatPrice(calculatedPrice.finalAmount)}
                      </span>
                    </div>
                    
                    {/* Demo transaction details */}
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
                {/* Demo success details */}
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
