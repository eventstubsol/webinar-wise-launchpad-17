
import { Users, GraduationCap, Building, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { BeamsBackground } from "@/components/ui/beams-background";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";

const targetAudienceItems: BentoItem[] = [
  {
    title: "Marketers",
    description: "Who run webinars every month and hate digging through spreadsheets",
    icon: <Users className="w-6 h-6 text-cyan-400" />,
    status: "Popular",
    hasPersistentHover: true,
  },
  {
    title: "Educators & Trainers",
    description: "Who want to measure learner engagement",
    icon: <GraduationCap className="w-6 h-6 text-cyan-400" />,
    status: "Growing",
  },
  {
    title: "SaaS Teams",
    description: "Running onboarding, demos, and community sessions",
    icon: <Building className="w-6 h-6 text-cyan-400" />,
    status: "Active",
  },
  {
    title: "Agencies",
    description: "Managing webinars for multiple clients",
    icon: <Briefcase className="w-6 h-6 text-cyan-400" />,
    status: "Pro",
  }
];

export const TargetAudienceSection = () => {
  return (
    <BeamsBackground className="min-h-screen" intensity="medium">
      <div className="container mx-auto max-w-6xl w-full flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0.5, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="text-center text-3xl md:text-4xl font-bold tracking-tight text-white mb-4"
          >
            Who's It For?
          </motion.h2>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.5,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="dark w-full"
        >
          <BentoGrid items={targetAudienceItems} />
        </motion.div>
      </div>
    </BeamsBackground>
  );
};
