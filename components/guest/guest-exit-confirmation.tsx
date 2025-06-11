"use client"

import { useTranslation } from "@/lib/translations/i18n"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/common/ui/alert-dialog"
import { Button } from "@/components/common/ui/button"
import { AlertTriangle, Save, Trash2 } from "lucide-react"

interface GuestExitConfirmationProps {
  isOpen: boolean
  onConfirmExit: () => void
  onCancel: () => void
  onSaveAndExit: () => void
  currentStep: string
  hasProgress: boolean
}

export default function GuestExitConfirmation({
  isOpen,
  onConfirmExit,
  onCancel,
  onSaveAndExit,
  currentStep,
  hasProgress
}: GuestExitConfirmationProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={isOpen} onOpenChange={() => {}}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {t("guest.exitConfirmation.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasProgress ? (
              <div className="space-y-2">
                <p>{t("guest.exitConfirmation.hasProgressDescription")}</p>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>{t("guest.exitConfirmation.currentStep")}:</strong> {t(`guest.steps.${currentStep}`)}
                  </p>
                </div>
              </div>
            ) : (
              t("guest.exitConfirmation.noProgressDescription")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {hasProgress && (
            <Button
              onClick={onSaveAndExit}
              variant="outline"
              className="w-full sm:w-auto order-1 sm:order-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {t("guest.exitConfirmation.saveAndExit")}
            </Button>
          )}
          
          <Button
            onClick={onConfirmExit}
            variant="destructive"
            className="w-full sm:w-auto order-3 sm:order-2"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {hasProgress ? t("guest.exitConfirmation.discardAndExit") : t("guest.exitConfirmation.exit")}
          </Button>
          
          <AlertDialogCancel 
            onClick={onCancel}
            className="w-full sm:w-auto order-2 sm:order-3"
          >
            {t("guest.exitConfirmation.continueEditing")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 