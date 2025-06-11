
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { CustomerLogosSection } from "@/components/landing/CustomerLogosSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PowerSpeedControlSection } from "@/components/landing/PowerSpeedControlSection";
import { InteractiveCTASection } from "@/components/landing/InteractiveCTASection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Landing: Auth state changed', { hasUser: !!user, loading });
    
    // If we have a user and we're not loading, redirect to dashboard
    if (!loading && user) {
      console.log('Landing: Redirecting authenticated user to dashboard');
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is authenticated, don't render landing page content
  // (they'll be redirected to dashboard)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <CustomerLogosSection />
      <FeaturesSection />
      <PowerSpeedControlSection />
      <InteractiveCTASection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Landing;
