
import { Sparkles } from "@/components/ui/sparkles";
import { useTheme } from "next-themes";

export const CustomerLogosSection = () => {
  const { theme } = useTheme();
  
  const logos = [
    {
      name: "Future IT Summit",
      src: "/lovable-uploads/6cc24532-a2cf-4194-84cc-f75d76c5a2f7.png"
    },
    {
      name: "The World CIO 200 Roadshow", 
      src: "/lovable-uploads/11c3d4cc-3c50-4163-85d5-27f105aff634.png"
    },
    {
      name: "GenWorks",
      src: "/lovable-uploads/29ed6a8e-f408-4f8a-9d74-aeaa25bb9155.png"
    },
    {
      name: "GCF Unite Virtual Summit",
      src: "/lovable-uploads/ce769fca-b30e-401b-ac8d-0d2b3961fd45.png"
    },
    {
      name: "Automation Anywhere",
      src: "/lovable-uploads/8f567799-3d94-4dac-af62-159f1dc8d1fd.png"
    },
    {
      name: "Cisco",
      src: "/lovable-uploads/6706f24d-9da2-4c4e-8ff0-ff4ac927e3b1.png"
    },
    {
      name: "Ingram Micro",
      src: "/lovable-uploads/9033886c-59ad-401b-bf94-e2b184f4ed96.png"
    }
  ];
  
  return (
    <div className="w-full overflow-hidden py-16">
      <div className="mx-auto mt-8 w-full max-w-4xl">
        <div className="text-center text-3xl text-foreground">
          <span className="text-indigo-900 dark:text-indigo-200">
            Trusted by experts.
          </span>
          <br />
          <span>Used by the leaders.</span>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8 items-center justify-items-center">
          {logos.map((logo, index) => (
            <LogoItem key={index} name={logo.name} src={logo.src} />
          ))}
        </div>
      </div>

      <div className="relative mt-16 h-64 w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)] z-20">
        <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#191970,transparent_70%)] before:opacity-40" />
        <div className="absolute -left-1/2 top-1/2 aspect-[1/0.7] z-10 w-[200%] rounded-[100%] border-t border-zinc-900/20 dark:border-white/20 bg-white dark:bg-zinc-900" />
        <Sparkles
          density={800}
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
          color="#ffffff"
        />
      </div>
    </div>
  );
};

// Logo Component
const LogoItem = ({ name, src }: { name: string; src: string }) => (
  <div className="flex items-center justify-center">
    <img
      src={src}
      alt={`${name} logo`}
      className="h-8 w-auto max-w-full opacity-60 hover:opacity-100 transition-opacity duration-200 filter grayscale hover:grayscale-0"
    />
  </div>
);
