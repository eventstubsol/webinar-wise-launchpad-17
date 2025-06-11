
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CTAProps {
  badge?: {
    text: string
  }
  title: string
  description?: string
  action: {
    text: string
    href: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
  withGlow?: boolean
  className?: string
}

export function CTASection({
  badge,
  title,
  description,
  action,
  withGlow = true,
  className,
}: CTAProps) {
  return (
    <section className={cn("overflow-hidden pt-0 md:pt-0", className)}>
      <div className="relative mx-auto flex max-w-container flex-col items-center gap-6 px-8 py-12 text-center sm:gap-8 md:py-24">
        {/* Frame Background */}
        <div 
          className="absolute inset-8 rounded-2xl opacity-0 animate-scale-in delay-100" 
          style={{ backgroundColor: '#191970' }}
        />
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-12 sm:gap-8 md:py-16">
          {/* Badge */}
          {badge && (
            <Badge
              variant="outline"
              className="opacity-0 animate-fade-in-up delay-200 border-white/20 text-white/90"
            >
              <span>{badge.text}</span>
            </Badge>
          )}

          {/* Title */}
          <h2 className="text-3xl font-semibold sm:text-5xl opacity-0 animate-fade-in-up delay-300 text-white">
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-white/80 opacity-0 animate-fade-in-up delay-400 font-light max-w-2xl">
              {description}
            </p>
          )}

          {/* Action Button */}
          <Button
            variant={action.variant || "default"}
            size="lg"
            className="opacity-0 animate-fade-in-up delay-500 bg-white text-[#191970] hover:bg-white/90"
            asChild
          >
            <a href={action.href}>{action.text}</a>
          </Button>
        </div>

        {/* Glow Effect */}
        {withGlow && (
          <div className="fade-top-lg pointer-events-none absolute inset-0 rounded-2xl shadow-glow opacity-0 animate-scale-in delay-700" />
        )}
      </div>
    </section>
  )
}
