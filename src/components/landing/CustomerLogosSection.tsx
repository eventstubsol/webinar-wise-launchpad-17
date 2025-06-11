
import { Sparkles } from "@/components/ui/sparkles";
import { useTheme } from "next-themes";
import { useState } from "react";

export const CustomerLogosSection = () => {
  const { theme } = useTheme();
  
  // Using placeholder.svg as fallback until we can verify the actual uploaded image paths
  const logos = [
    {
      name: "Future IT Summit",
      src: "/placeholder.svg"
    },
    {
      name: "The World CIO 200 Roadshow", 
      src: "/placeholder.svg"
    },
    {
      name: "GenWorks",
      src: "/placeholder.svg"
    },
    {
      name: "GCF Unite Virtual Summit",
      src: "/placeholder.svg"
    },
    {
      name: "Automation Anywhere",
      src: "/placeholder.svg"
    },
    {
      name: "Cisco",
      src: "/placeholder.svg"
    },
    {
      name: "Ingram Micro",
      src: "/placeholder.svg"
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

// Logo Component with error handling
const LogoItem = ({ name, src }: { name: string; src: string }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    console.error(`Failed to load image: ${src} for ${name}`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log(`Successfully loaded image: ${src} for ${name}`);
    setImageLoaded(true);
  };

  return (
    <div className="flex items-center justify-center">
      {imageError ? (
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
          {name.split(' ')[0]}
        </div>
      ) : (
        <img
          src={src}
          alt={`${name} logo`}
          className="h-8 w-auto max-w-full opacity-60 hover:opacity-100 transition-opacity duration-200 filter grayscale hover:grayscale-0"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
    </div>
  );
};
