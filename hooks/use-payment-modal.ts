import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type PaymentStatus = "pending" | "success" | "failed";

export interface UsePaymentModalProps {
  onSuccess: () => void | Promise<void>;
  onFailure?: (reason?: string) => void | Promise<void>;
  pendingBookingId?: string | null;
}

export function usePaymentModal({ onSuccess, onFailure, pendingBookingId }: UsePaymentModalProps) {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isCountingDown && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && isCountingDown) {
      setIsCountingDown(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown, isCountingDown]);

  const openModal = () => {
    if (isCountingDown) return;
    setShowPaymentModal(true);
    setPaymentStatus("pending");
  };

  const handlePaymentSuccess = async () => {
    console.log("💰 Payment simulation success triggered")
    setPaymentStatus("success");
    // Immediately execute success callback for automatic redirect
    setTimeout(async () => {
      console.log("🎯 Executing onSuccess callback after delay")
      setShowPaymentModal(false);
      await onSuccess();
      console.log("✅ onSuccess callback completed")
    }, 500);
  };

  const handlePaymentFailure = async (reason?: string) => {
    setPaymentStatus("failed");
    
    // If custom failure handler provided, use it
    if (onFailure) {
      setTimeout(async () => {
        setShowPaymentModal(false);
        await onFailure(reason);
      }, 1000);
    } else {
      // Default behavior - redirect to failure page
      setTimeout(() => {
        setShowPaymentModal(false);
        const failureUrl = pendingBookingId 
          ? `/bookings/confirmation?bookingId=${pendingBookingId}&status=failed${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`
          : `/bookings/confirmation?status=failed${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
        router.push(failureUrl);
      }, 1000);
    }
  };

  const handleTryAgain = () => {
    setShowPaymentModal(false);
    setPaymentStatus("pending");
    setCountdown(10);
    setIsCountingDown(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowPaymentModal(false);
      setPaymentStatus("pending");
    } else {
      setShowPaymentModal(true);
    }
  };

  return {
    showPaymentModal,
    paymentStatus,
    countdown,
    isCountingDown,
    openModal,
    handlePaymentSuccess,
    handlePaymentFailure,
    handleTryAgain,
    handleOpenChange,
  };
}
