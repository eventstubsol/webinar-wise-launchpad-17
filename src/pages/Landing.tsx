
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { CustomerLogosSection } from "@/components/landing/CustomerLogosSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PowerSpeedControlSection } from "@/components/landing/PowerSpeedControlSection";
import { InteractiveCTASection } from "@/components/landing/InteractiveCTASection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { BackgroundBoxesSection } from "@/components/landing/BackgroundBoxesSection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <CustomerLogosSection />
      <FeaturesSection />
      <PowerSpeedControlSection />
      <InteractiveCTASection />
      <FinalCTASection />
      <BackgroundBoxesSection />
      <Footer />
    </div>
  );
};

export default Landing;
