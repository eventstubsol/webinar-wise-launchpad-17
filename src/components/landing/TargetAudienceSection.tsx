
import { Users, GraduationCap, Building, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { LampContainer } from "@/components/ui/lamp";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";

const targetAudienceItems: BentoItem[] = [
  {
    title: "Marketers",
    description: "Who run webinars every month and hate digging through spreadsheets",
    icon: <Users className="w-6 h-6 text-cyan-400" />,
    status: "Popular",
    colSpan: 2,
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
    colSpan: 2,
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
    <LampContainer className="min-h-screen">
      <div className="container mx-auto max-w-6xl w-full">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0.5, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="bg-gradient-to-br from-slate-300 to-slate-500 bg-clip-text text-center text-3xl md:text-4xl font-bold tracking-tight text-transparent mb-4"
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
          className="dark"
        >
          <style jsx>{`
            .dark .group:hover {
              box-shadow: 0 2px 12px rgba(6, 182, 212, 0.1) !important;
            }
            .dark [class*="border-gray-100"] {
              border-color: rgb(71 85 105 / 0.7) !important;
            }
            .dark [class*="bg-white"] {
              background-color: rgb(30 41 59 / 0.5) !important;
              backdrop-filter: blur(4px) !important;
            }
            .dark [class*="bg-black"] {
              background-color: rgb(30 41 59 / 0.5) !important;
              backdrop-filter: blur(4px) !important;
            }
          `}</style>
          <BentoGrid items={targetAudienceItems} />
        </motion.div>
      </div>
    </LampContainer>
  );
};
