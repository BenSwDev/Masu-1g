"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/translations/i18n";
import { usePaymentDrawer } from "@/hooks/use-payment-drawer";
import { PaymentDrawer } from "@/components/common/purchase/payment-drawer";
import { toast } from "sonner";
import { Button } from "@/components/common/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/ui/card";
import { Separator } from "@/components/common/ui/separator";
import { Badge } from "@/components/common/ui/badge";
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
  Shield,
} from "lucide-react";
import type { CalculatedPriceDetails } from "@/types/booking";

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: Date;
  gender?: "male" | "female";
  notes?: string;
  isBookingForSomeoneElse?: boolean;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientBirthDate?: Date;
  recipientGender?: "male" | "female";
  // Notification preferences
  bookerNotificationMethod?: "email" | "sms" | "both";
  bookerNotificationLanguage?: "he" | "en" | "ru";
  recipientNotificationMethod?: "email" | "sms" | "both";
  recipientNotificationLanguage?: "he" | "en" | "ru";
  // ➕ הסכמות חדשות
  consents?: {
    customerAlerts: "sms" | "email" | "none";
    patientAlerts: "sms" | "email" | "none";
    marketingOptIn: boolean;
    termsAccepted: boolean;
  };
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
  customFailureHandler?: (reason?: string) => void | Promise<void>;
  // ➕ הוספת פרמטרים לזיהוי סוג הרכישה ותיאור מותאם
  purchaseType?: "booking" | "subscription" | "gift_voucher";
  purchaseDetails?: {
    treatmentName?: string;
    subscriptionName?: string;
    treatmentQuantity?: number;
    voucherType?: "treatment" | "monetary";
    voucherAmount?: number;
  };
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
  customFailureHandler,
  purchaseType = "booking",
  purchaseDetails = {},
}: GuestPaymentStepProps) {
  const { t, dir } = useTranslation()
  const paymentDrawer = usePaymentDrawer({ 
    onSuccess: async (data) => {
      console.log("🏦 GuestPaymentStep onSuccess triggered - payment completed successfully", data)
      
      // ✅ Simply call onConfirm which will create the final booking directly
      console.log("🎯 Calling onConfirm (handleFinalSubmit)")
      onConfirm();
    },
    onError: (error) => {
      console.log("🚨 Payment failed:", error)
      if (customFailureHandler) {
        customFailureHandler(error)
      }
    }
  });
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(true);
  
  // ➕ שדות הסכמות חדשים
  const [customerAlerts, setCustomerAlerts] = useState<"sms" | "email" | "none">("sms");
  const [patientAlerts, setPatientAlerts] = useState<"sms" | "email" | "none">("sms");

  // Notification preferences state - Default to "both" (email + SMS)
  const [bookerNotificationMethod, setBookerNotificationMethod] = useState<
    "email" | "sms" | "both"
  >(guestInfo.bookerNotificationMethod || "both");
  const [bookerNotificationLanguage, setBookerNotificationLanguage] = useState<
    "he" | "en" | "ru"
  >(guestInfo.bookerNotificationLanguage || "he");
  const [recipientNotificationMethod, setRecipientNotificationMethod] =
    useState<"email" | "sms" | "both">(
      guestInfo.recipientNotificationMethod || "both",
    );
  const [recipientNotificationLanguage, setRecipientNotificationLanguage] =
    useState<"he" | "en" | "ru">(
      guestInfo.recipientNotificationLanguage || "he",
    );

  // Update guest info when notification preferences change
  useEffect(() => {
    setGuestInfo({
      ...guestInfo,
      bookerNotificationMethod,
      bookerNotificationLanguage,
      recipientNotificationMethod,
      recipientNotificationLanguage,
      // ➕ הסכמות חדשות
      consents: {
        customerAlerts,
        patientAlerts,
        marketingOptIn: marketingConsent,
        termsAccepted,
      },
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

  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error);
    setPaymentUrl(null);
    setIsPaymentLoading(false);
    toast.error(error || "התשלום נכשל");
  };

  const handlePaymentCancel = () => {
    console.log("Payment cancelled");
    setPaymentUrl(null);
    setIsPaymentLoading(false);
    toast.info("התשלום בוטל");
  };

  const handlePayNow = async () => {
    if (!termsAccepted || isPaymentLoading || paymentDrawer.isLoading) return;

    setIsPaymentLoading(true);

    try {
      // Create booking if needed (for backward compatibility)
      let finalBookingId = pendingBookingId;
      if (createPendingBooking && !finalBookingId) {
        finalBookingId = await createPendingBooking();
        if (!finalBookingId) {
          throw new Error("Failed to create booking");
        }
      }

      // ✅ If no booking ID is available after creating pending booking, show error
      if (!finalBookingId) {
        throw new Error("No booking ID available - failed to create pending booking");
      }

      // ✅ For existing bookings with booking ID - proceed with payment API call
      // Update guest info with consents
      const customerAlertsMethod = bookerNotificationMethod === "both" ? "email" as const : 
                                  bookerNotificationMethod === "sms" ? "sms" as const : "email" as const;
      const patientAlertsMethod = recipientNotificationMethod === "both" ? "email" as const : 
                                 recipientNotificationMethod === "sms" ? "sms" as const : "email" as const;

      const updatedGuestInfo = {
        ...guestInfo,
        consents: {
          customerAlerts: customerAlertsMethod,
          patientAlerts: patientAlertsMethod,
          marketingOptIn: marketingConsent,
          termsAccepted: termsAccepted,
        }
      };
      setGuestInfo(updatedGuestInfo);

      // Create payment with credit card processing
      // ✅ יצירת תיאור דינמי לפי סוג הרכישה
      let description = `הזמנה ${finalBookingId}`;
      
      if (purchaseType === "subscription") {
        const treatmentName = purchaseDetails.treatmentName || "טיפול";
        const quantity = purchaseDetails.treatmentQuantity || 1;
        description = `רכישת מנוי - ${treatmentName} x${quantity} טיפולים`;
      } else if (purchaseType === "gift_voucher") {
        if (purchaseDetails.voucherType === "monetary") {
          description = `רכישת שובר מתנה כספי - ₪${purchaseDetails.voucherAmount}`;
        } else {
          const treatmentName = purchaseDetails.treatmentName || "טיפול";
          description = `רכישת שובר מתנה - ${treatmentName}`;
        }
      } else {
        // Default booking description
        description = `הזמנת טיפול - הזמנה ${finalBookingId}`;
      }

      // ✅ פתיחת PaymentDrawer עם כל הנתונים
      await paymentDrawer.openDrawer({
        bookingId: finalBookingId,
        amount: calculatedPrice?.finalAmount || 0,
        description: description,
        customerName: `${guestInfo.firstName || ''} ${guestInfo.lastName || ''}`.trim(),
        customerEmail: guestInfo.email,
        customerPhone: guestInfo.phone,
        type: purchaseType,
        createDocument: true,
        documentType: purchaseType === "booking" ? "Order" : "Receipt"
      });
      
    } catch (error) {
      console.error("Payment preparation failed:", error);
      toast.error(error instanceof Error ? error.message : "שגיאה בהכנת התשלום");
    } finally {
      setIsPaymentLoading(false);
    }
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
          <h2 className="text-2xl font-semibold tracking-tight">תשלום</h2>
          <p className="text-muted-foreground mt-2">
            סיכום ההזמנה והמעבר לתשלום
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
                          <span>• {surcharge.description === "workingHours.eveningHours" ? "שעות ערב" : surcharge.description || "תוספת מחיר"}:</span>
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
              איך תרצה לקבל את פרטי ההזמנה והעידכונים?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booker Notification Preferences */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                איך תרצה לקבל את פרטי ההזמנה והעדכונים?
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium">אמצעי התראה:</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="booker-email"
                        checked={bookerNotificationMethod === "email" || bookerNotificationMethod === "both"}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (bookerNotificationMethod === "sms") {
                              setBookerNotificationMethod("both")
                            } else {
                              setBookerNotificationMethod("email")
                    }
                          } else {
                            if (bookerNotificationMethod === "both") {
                              setBookerNotificationMethod("sms")
                            } else {
                              setBookerNotificationMethod("both") // Default to both if unchecking the only option
                            }
                          }
                        }}
                      />
                      <label htmlFor="booker-email" className="text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                        אימייל
                      </label>
                        </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="booker-sms"
                        checked={bookerNotificationMethod === "sms" || bookerNotificationMethod === "both"}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (bookerNotificationMethod === "email") {
                              setBookerNotificationMethod("both")
                            } else {
                              setBookerNotificationMethod("sms")
                            }
                          } else {
                            if (bookerNotificationMethod === "both") {
                              setBookerNotificationMethod("email")
                            } else {
                              setBookerNotificationMethod("both") // Default to both if unchecking the only option
                            }
                          }
                        }}
                      />
                      <label htmlFor="booker-sms" className="text-sm flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                        SMS
                      </label>
                        </div>
                        </div>
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
                  <div className="space-y-3">
                    <label className="text-sm font-medium">אמצעי התראה:</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="recipient-email"
                          checked={recipientNotificationMethod === "email" || recipientNotificationMethod === "both"}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (recipientNotificationMethod === "sms") {
                                setRecipientNotificationMethod("both")
                              } else {
                                setRecipientNotificationMethod("email")
                      }
                            } else {
                              if (recipientNotificationMethod === "both") {
                                setRecipientNotificationMethod("sms")
                              } else {
                                setRecipientNotificationMethod("both") // Default to both if unchecking the only option
                              }
                            }
                          }}
                        />
                        <label htmlFor="recipient-email" className="text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                          אימייל
                        </label>
                          </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="recipient-sms"
                          checked={recipientNotificationMethod === "sms" || recipientNotificationMethod === "both"}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (recipientNotificationMethod === "email") {
                                setRecipientNotificationMethod("both")
                              } else {
                                setRecipientNotificationMethod("sms")
                              }
                            } else {
                              if (recipientNotificationMethod === "both") {
                                setRecipientNotificationMethod("email")
                              } else {
                                setRecipientNotificationMethod("both") // Default to both if unchecking the only option
                              }
                            }
                          }}
                        />
                        <label htmlFor="recipient-sms" className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                          SMS
                        </label>
                          </div>
                          </div>
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

            {/* Checkboxes */}
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
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="space-y-4">
          {/* כפתורי ניווט עם תשלום */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrev} disabled={isLoading}>
              חזור
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={isLoading || isPaymentLoading || paymentDrawer.isLoading || !termsAccepted}
              size="lg"
              className="px-8"
            >
              {(isLoading || isPaymentLoading || paymentDrawer.isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {`שלם כעת בכרטיס אשראי ${formatPrice(calculatedPrice.finalAmount)}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Drawer */}
      <PaymentDrawer
        isOpen={paymentDrawer.isOpen}
        onClose={paymentDrawer.closeDrawer}
        paymentUrl={paymentDrawer.paymentUrl}
        paymentId={paymentDrawer.paymentId}
        bookingId={paymentDrawer.paymentData?.bookingId}
        amount={paymentDrawer.paymentData?.amount}
        description={paymentDrawer.paymentData?.description}
        onSuccess={paymentDrawer.handleSuccess}
        onError={paymentDrawer.handleError}
      />
    </>
  );
}
