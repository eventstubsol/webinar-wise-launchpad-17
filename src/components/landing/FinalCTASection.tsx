
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { motion } from "framer-motion";

export const FinalCTASection = () => {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 1.1,
        ease: [0.25, 0.4, 0.25, 1],
      },
    },
  };

  return (
    <section className="relative">
      <div className="relative">
        <HeroGeometric
          badge="Webinar Wise"
          title1="Ready to see what your"
          title2="webinars are really saying?"
        />
        
        {/* Overlay content with button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-20 container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="mt-8"
              >
                <p className="text-lg mb-6 text-white/60">
                  No credit card. No setup hassle. Just insights.
                </p>
                <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-3">
                  <Link to="/register">Get Started Free</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
