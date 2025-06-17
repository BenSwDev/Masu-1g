import { useEffect, useState } from "react";

export type PaymentStatus = "pending" | "success" | "failed";

export interface UsePaymentModalProps {
  onSuccess: () => void;
}

export function usePaymentModal({ onSuccess }: UsePaymentModalProps) {
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

  const handlePaymentSuccess = () => {
    setPaymentStatus("success");
    setTimeout(() => {
      setShowPaymentModal(false);
      onSuccess();
    }, 1500);
  };

  const handlePaymentFailure = () => {
    setPaymentStatus("failed");
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
