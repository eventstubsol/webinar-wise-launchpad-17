
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { CustomerLogosSection } from "@/components/landing/CustomerLogosSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PowerSpeedControlSection } from "@/components/landing/PowerSpeedControlSection";
import { InteractiveCTASection } from "@/components/landing/InteractiveCTASection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <CustomerLogosSection />
      <FeaturesSection />
      <PowerSpeedControlSection />
      <InteractiveCTASection />
      <HowItWorksSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Landing;
