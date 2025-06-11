
import { CTASection } from "@/components/ui/cta-with-rectangle";

export const WhyNowSection = () => {
  return (
    <CTASection
      badge={{
        text: "Why Now?"
      }}
      title="Because you're spending hours cleaning data when you should be learning from it."
      description="Webinar Wise turns every Zoom event into a strategic advantage — instantly."
      action={{
        text: "Get Started Today",
        href: "/register",
        variant: "default"
      }}
      className="py-16 px-4 bg-white"
    />
  );
};
