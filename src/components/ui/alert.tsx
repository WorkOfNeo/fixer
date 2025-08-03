"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertProps {
  className?: string
  variant?: "default" | "destructive"
  children: React.ReactNode
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-blue-200 bg-blue-50 text-blue-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Alert.displayName = "Alert"

interface AlertDescriptionProps {
  className?: string
  children: React.ReactNode
}

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm", className)}
      {...props}
    >
      {children}
    </div>
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription } 