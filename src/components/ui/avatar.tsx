import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import Image from "next/image"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
    "relative flex shrink-0 overflow-hidden rounded-full",
    {
        variants: {
            size: {
                sm: "h-8 w-8 text-xs",
                md: "h-10 w-10 text-sm",
                lg: "h-12 w-12 text-base",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
)

export interface AvatarProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
    src?: string
    alt?: string
    fallback?: string
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, src, alt, fallback, size, ...props }, ref) => {
        return (
            <div ref={ref} className={cn(avatarVariants({ size, className }))} {...props}>
                {src ? (
                    <Image
                        src={src}
                        alt={alt || "Avatar"}
                        width={size === "sm" ? 32 : size === "lg" ? 48 : 40}
                        height={size === "sm" ? 32 : size === "lg" ? 48 : 40}
                        className="aspect-square h-full w-full"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-medium">
                        {fallback ? fallback.charAt(0).toUpperCase() : "U"}
                    </div>
                )}
            </div>
        )
    }
)

Avatar.displayName = "Avatar"

export { Avatar, avatarVariants }