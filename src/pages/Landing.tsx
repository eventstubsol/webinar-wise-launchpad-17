
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { CustomerLogosSection } from "@/components/landing/CustomerLogosSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { BonusFeaturesSection } from "@/components/landing/BonusFeaturesSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <CustomerLogosSection />
      <FeaturesSection />
      <BonusFeaturesSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Landing;
