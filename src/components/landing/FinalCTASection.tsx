
import { CTASection } from "@/components/ui/cta-with-rectangle";

export const FinalCTASection = () => {
  return (
    <CTASection
      badge={{
        text: "Get started"
      }}
      title="Ready to see what your webinars are really saying?"
      description="No credit card. No setup hassle. Just insights."
      action={{
        text: "Get Started Free",
        href: "/register",
        variant: "default"
      }}
      className="bg-primary text-white"
    />
  );
};
