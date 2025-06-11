
import { Sparkles } from "@/components/ui/sparkles";
import { useTheme } from "next-themes";
import { useState } from "react";

export const CustomerLogosSection = () => {
  const { theme } = useTheme();
  
  // Updated with 5 logos (removed Automation Anywhere and Ingram Micro)
  const logos = [
    {
      name: "Future IT Summit",
      src: "/lovable-uploads/73267402-2106-4770-b8d9-ab1d51646a02.png"
    },
    {
      name: "The World CIO 200 Roadshow", 
      src: "/lovable-uploads/a8265af5-8c1b-4f2c-9b64-461f85c35498.png"
    },
    {
      name: "GenWorks",
      src: "/lovable-uploads/273d45d8-b475-459a-9158-10837812c8b2.png"
    },
    {
      name: "GCF Unite Virtual Summit",
      src: "/lovable-uploads/0bbe944b-43b1-4e63-86ae-6a75569cea7a.png"
    },
    {
      name: "Cisco",
      src: "/lovable-uploads/d3011340-f45f-4d8c-b42a-3c95a640618a.png"
    }
  ];
  
  return (
    <div className="h-auto w-full overflow-hidden py-16">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center text-3xl text-foreground">
          <span className="text-indigo-900 dark:text-indigo-200">
            Trusted by experts.
          </span>
          <br />
          <span>Used by the leaders.</span>
        </div>

        <div className="mt-14 grid grid-cols-5 text-zinc-900 dark:text-white">
          {logos.map((logo, index) => (
            <LogoItem key={index} name={logo.name} src={logo.src} />
          ))}
        </div>
      </div>

      <div className="relative mt-16 h-96 w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]">
        <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#8350e8,transparent_70%)] before:opacity-40" />
        <div className="absolute -left-1/2 top-1/2 aspect-[1/0.7] z-20 w-[200%] rounded-[100%] border-t border-zinc-900/20 dark:border-white/20 bg-white dark:bg-zinc-900" />
        <Sparkles
          density={1200}
          className="absolute inset-x-0 bottom-0 h-full w-full z-15 [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
          color={theme === "dark" ? "#ffffff" : "#000000"}
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
        <div className="h-18 w-36 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
          {name.split(' ')[0]}
        </div>
      ) : (
        <img
          src={src}
          alt={`${name} logo`}
          className="h-18 w-auto max-w-full opacity-60 hover:opacity-100 transition-opacity duration-200 filter grayscale hover:grayscale-0"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
    </div>
  );
};
