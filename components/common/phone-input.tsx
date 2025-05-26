"use client"

import * as React from "react"
import { cn } from "@/lib/utils/utils"
import { Input } from "@/components/common/ui/input"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/common/ui/dropdown-menu"
import { Button } from "@/components/common/ui/button"

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  defaultCountryCode?: string
  onPhoneChange?: (fullNumber: string) => void
}

const countryCodes = [
  { code: "+972", country: "IL", flag: "🇮🇱" },
  { code: "+1", country: "US", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+7", country: "RU", flag: "🇷🇺" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
]

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, defaultCountryCode = "+972", onPhoneChange, ...props }, ref) => {
    const [selectedCode, setSelectedCode] = React.useState(defaultCountryCode)
    const [phoneNumber, setPhoneNumber] = React.useState("")
    const selectedCountry = countryCodes.find((c) => c.code === selectedCode) || countryCodes[0]
    const inputRef = React.useRef<HTMLInputElement>(null)
    const hiddenInputRef = React.useRef<HTMLInputElement>(null)

    // Combine ref from props with local ref
    const combinedRef = (node: HTMLInputElement) => {
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
      inputRef.current = node
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "") // Remove non-digits
      
      // If the number starts with 0, remove it
      const processedValue = value.startsWith("0") ? value.substring(1) : value
      
      // For Israeli numbers, ensure it starts with 5
      if (selectedCode === "+972" && processedValue && !processedValue.startsWith("5")) {
        return // Don't update if it's an invalid Israeli number
      }
      
      setPhoneNumber(processedValue)
      
      // Update the hidden input with the formatted number
      if (hiddenInputRef.current) {
        const fullNumber = processedValue ? `${selectedCode}${processedValue}` : ""
        hiddenInputRef.current.value = fullNumber
        if (onPhoneChange) {
          onPhoneChange(fullNumber)
        }
      }
    }

    // Update the hidden input and call onPhoneChange when either code or number changes
    React.useEffect(() => {
      let fullNumber = ""

      if (phoneNumber) {
        // Always include the country code with + sign
        fullNumber = selectedCode + (phoneNumber.startsWith("0") ? phoneNumber.substring(1) : phoneNumber)
      }

      // Always call onPhoneChange, even with empty string
      if (onPhoneChange) {
        onPhoneChange(fullNumber)
      }

      // Update the hidden input value
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = fullNumber
      }
    }, [selectedCode, phoneNumber, onPhoneChange])

    const handleCodeChange = (code: string) => {
      setSelectedCode(code)
    }

    return (
      <div className="relative flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="rounded-r-none border-r-0 px-3 hover:bg-gray-50 focus:z-10"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm font-medium">{selectedCode}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            {countryCodes.map((country) => (
              <DropdownMenuItem
                key={country.code}
                onClick={() => handleCodeChange(country.code)}
                className="flex items-center gap-2"
              >
                <span className="text-lg">{country.flag}</span>
                <span className="font-medium">{country.code}</span>
                <span className="text-sm text-muted-foreground">{country.country}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          type="tel"
          ref={combinedRef}
          value={phoneNumber}
          onChange={handlePhoneChange}
          className={cn("rounded-l-none text-center placeholder:text-center", className)}
          {...props}
        />
        <input
          ref={hiddenInputRef}
          type="hidden"
          name={props.name || "phone"}
          value={phoneNumber ? `${selectedCode}${phoneNumber}` : ""}
        />
      </div>
    )
  },
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
