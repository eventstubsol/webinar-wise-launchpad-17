
"use client"

import { HeroSection } from "@/components/ui/hero-section"
import { Icons } from "@/components/ui/icons"

export function HeroSectionDemo() {
  return (
    <HeroSection
      badge={{
        text: "Introducing Webinar Wise",
        action: {
          text: "Learn more",
          href: "/register",
        },
      }}
      title="Transform Your Webinar Data Into Actionable Insights"
      description="Connect your Zoom account and get powerful analytics, participant insights, and beautiful reports that help you understand and improve your webinar performance."
      actions={[
        {
          text: "Get Started Free",
          href: "/register",
          variant: "default",
        },
        {
          text: "GitHub",
          href: "https://github.com",
          variant: "glow",
          icon: <Icons.gitHub className="h-5 w-5" />,
        },
      ]}
      image={{
        light: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop&crop=center",
        dark: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop&crop=center",
        alt: "Webinar Analytics Dashboard Preview",
      }}
    />
  )
}
