"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"
import { getAllGiftVouchers, getGiftVoucherById } from "@/actions/gift-voucher-actions"
import { toast } from "@/components/common/ui/use-toast"

interface GiftVouchersClientProps {
  initialVouchers: IGiftVoucher[]
  error: string | null
}

export default function GiftVouchersClient({ initialVouchers, error }: GiftVouchersClientProps) {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<IGiftVoucher[]>(initialVouchers);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openVoucherDetails, setOpenVoucherDetails] = useState(false);
  const [openDeactivateAlert, setOpenDeactivateAlert] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<IGiftVoucher | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Filter vouchers based on search query and active tab
  const filteredVouchers = vouchers.filter((voucher) => {
    const matchesSearch = 
      voucher.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (voucher.recipientName && voucher.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (voucher.recipientEmail && voucher.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'active') return matchesSearch && voucher.isActive && !voucher.isRedeemed && !voucher.isExpired;
    if (activeTab === 'redeemed') return matchesSearch && voucher.isRedeemed;
    if (activeTab === 'expired') return matchesSearch && (!voucher.isActive || voucher.isExpired);
    
    return matchesSearch;
  });

  // Refresh vouchers list
  const refreshVouchers = async () => {
    setIsLoading(true);
    try {
      const { success, giftVouchers: refreshedVouchers } = await getAllGiftVouchers();
      if (success && refreshedVouchers) {
        setVouchers(refreshedVouchers);
        toast({
          title: t('success'),
          description: t('vouchers_refreshed'),
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_refresh_vouchers'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // View voucher details
  const handleViewVoucher = async (voucherId: string) => {
    setIsLoading(true);
    try {
      const { success, giftVoucher, message } = await getGiftVoucherById(voucherId);
      
      if (success && giftVoucher) {
        setSelectedVoucher(giftV\
