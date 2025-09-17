"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "compact" | "wide" | "full"
  children: React.ReactNode
}

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
      compact: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",
      wide: "max-w-full mx-auto px-4 sm:px-6 lg:px-8",
      full: "w-full px-4 sm:px-6 lg:px-8"
    }

    return (
      <div
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveContainer.displayName = "ResponsiveContainer"

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: "none" | "sm" | "md" | "lg" | "xl"
  children: React.ReactNode
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, cols = { default: 1, sm: 1, md: 2, lg: 3, xl: 4 }, gap = "md", children, ...props }, ref) => {
    const gapClasses = {
      none: "gap-0",
      sm: "gap-2 sm:gap-3",
      md: "gap-4 sm:gap-6",
      lg: "gap-6 sm:gap-8",
      xl: "gap-8 sm:gap-10"
    }

    const colsClasses = [
      cols.default && `grid-cols-${cols.default}`,
      cols.sm && `sm:grid-cols-${cols.sm}`,
      cols.md && `md:grid-cols-${cols.md}`,
      cols.lg && `lg:grid-cols-${cols.lg}`,
      cols.xl && `xl:grid-cols-${cols.xl}`
    ].filter(Boolean).join(" ")

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          colsClasses,
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveGrid.displayName = "ResponsiveGrid"

interface FluidTextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption"
  as?: React.ElementType
  children: React.ReactNode
}

const FluidText = React.forwardRef<HTMLElement, FluidTextProps>(
  ({ className, variant = "body", as, children, ...props }, ref) => {
    const Component = as || "p"

    const variants = {
      h1: "text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight",
      h2: "text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold tracking-tight",
      h3: "text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold",
      h4: "text-base sm:text-lg lg:text-xl xl:text-2xl font-medium",
      body: "text-sm sm:text-base",
      small: "text-xs sm:text-sm",
      caption: "text-xs"
    }

    return (
      <Component
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
FluidText.displayName = "FluidText"

interface ResponsiveSpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
}

const ResponsiveSpacer = React.forwardRef<HTMLDivElement, ResponsiveSpacerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizes = {
      xs: "h-2 sm:h-3",
      sm: "h-4 sm:h-6",
      md: "h-6 sm:h-8",
      lg: "h-8 sm:h-12",
      xl: "h-12 sm:h-16",
      "2xl": "h-16 sm:h-24"
    }

    return (
      <div
        ref={ref}
        className={cn(sizes[size], className)}
        {...props}
      />
    )
  }
)
ResponsiveSpacer.displayName = "ResponsiveSpacer"

export { ResponsiveContainer, ResponsiveGrid, FluidText, ResponsiveSpacer }