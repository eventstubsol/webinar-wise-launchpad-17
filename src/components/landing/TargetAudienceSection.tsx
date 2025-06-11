
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Building, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { LampContainer } from "@/components/ui/lamp";

const targetAudience = [
  {
    icon: Users,
    title: "Marketers",
    description: "Who run webinars every month and hate digging through spreadsheets"
  },
  {
    icon: GraduationCap,
    title: "Educators & Trainers",
    description: "Who want to measure learner engagement"
  },
  {
    icon: Building,
    title: "SaaS Teams",
    description: "Running onboarding, demos, and community sessions"
  },
  {
    icon: Briefcase,
    title: "Agencies",
    description: "Managing webinars for multiple clients"
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {targetAudience.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.7 + index * 0.1,
                duration: 0.6,
                ease: "easeInOut",
              }}
            >
              <Card className="text-center hover:shadow-lg transition-shadow bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <audience.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <CardTitle className="text-lg text-slate-200">{audience.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-400 text-sm">
                    {audience.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </LampContainer>
  );
};
