import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { motion } from "framer-motion";
export const FinalCTASection = () => {
  const fadeUpVariants = {
    hidden: {
      opacity: 0,
      y: 30
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 1.1,
        ease: [0.25, 0.4, 0.25, 1]
      }
    }
  };
  return <section className="relative">
      <div className="relative">
        <HeroGeometric badge="Webinar Wise" title1="Ready to see what your" title2="webinars are really saying?" />
        
        {/* Overlay content with button */}
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 flex items-center justify-center">
          
        </div>
      </div>
    </section>;
};