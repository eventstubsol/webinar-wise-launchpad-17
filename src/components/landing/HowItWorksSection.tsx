
import { Link, Zap } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

export const HowItWorksSection = () => {
  const timelineData = [
    {
      id: 1,
      title: "Connect",
      date: "Step 1",
      content: "Seamlessly integrate with your Zoom account in just a few clicks. Our secure OAuth connection ensures your data remains protected while giving us access to your webinar metrics.",
      category: "Integration",
      icon: Link,
      relatedIds: [2],
      status: "completed" as const,
      energy: 100,
    },
    {
      id: 2,
      title: "Analyze",
      date: "Step 2",
      content: "Our AI processes and organizes your webinar data, identifying patterns, engagement levels, and participant behaviors to extract meaningful insights.",
      category: "Processing",
      icon: Zap,
      relatedIds: [1, 3],
      status: "completed" as const,
      energy: 90,
    },
    {
      id: 3,
      title: "Visualize",
      date: "Step 3",
      content: "Access interactive dashboards and comprehensive reports that transform raw data into clear, actionable visualizations for better decision-making.",
      category: "Dashboard",
      icon: Link,
      relatedIds: [2, 4],
      status: "in-progress" as const,
      energy: 75,
    },
    {
      id: 4,
      title: "Optimize",
      date: "Step 4",
      content: "Implement AI-suggested improvements based on data-driven insights to enhance future webinar performance and engagement rates.",
      category: "Enhancement",
      icon: Zap,
      relatedIds: [3],
      status: "pending" as const,
      energy: 60,
    },
  ];

  return (
    <section className="relative">
      <RadialOrbitalTimeline timelineData={timelineData} />
    </section>
  );
};
