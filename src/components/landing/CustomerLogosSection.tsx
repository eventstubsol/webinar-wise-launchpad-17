
import { Sparkles } from "@/components/ui/sparkles";
import { useTheme } from "next-themes";

export const CustomerLogosSection = () => {
  const { theme } = useTheme();
  
  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="mx-auto mt-[2.8rem] w-full max-w-2xl">
        <div className="text-center text-3xl text-foreground">
          <span className="text-indigo-900 dark:text-indigo-200">
            Trusted by experts.
          </span>
          <br />
          <span>Used by the leaders.</span>
        </div>

        <div className="mt-14 grid grid-cols-5 text-zinc-900 dark:text-white">
          <Retool />
          <Vercel />
          <Remote />
          <Arc />
          <Raycast />
        </div>
      </div>

      <div className="relative -mt-32 h-96 w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]">
        <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#8350e8,transparent_70%)] before:opacity-40" />
        <div className="absolute -left-1/2 top-1/2 aspect-[1/0.7] z-10 w-[200%] rounded-[100%] border-t border-zinc-900/20 dark:border-white/20 bg-white dark:bg-zinc-900" />
        <Sparkles
          density={1200}
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
          color={theme === "dark" ? "#ffffff" : "#000000"}
        />
      </div>
    </div>
  );
};

// Company Logo Components
const Retool = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" className="w-full">
    <path d="M34 18.2a2.2 2.2 0 012.2-2.2h8.6a2.2 2.2 0 012.2 2.2v1.7a1.1 1.1 0 01-1.1 1.1H35.1a1.1 1.1 0 01-1.1-1.1v-1.7zM34 25.1a1.1 1.1 0 011.1-1.1h20.7a2.2 2.2 0 012.2 2.2v5.7a1.1 1.1 0 01-1.1 1.1H36.2a2.2 2.2 0 01-2.2-2.2v-5.7zM45 37.1a1.1 1.1 0 011.1-1.1h10.8a1.1 1.1 0 011.1 1.1v.7a2.2 2.2 0 01-2.2 2.2h-8.6a2.2 2.2 0 01-2.2-2.2v-.7z" />
  </svg>
);

const Vercel = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" className="w-full">
    <path d="M89 28l11-19h-22l11 19z" />
  </svg>
);

const Remote = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" className="w-full">
    <rect x="45" y="20" width="90" height="16" rx="8" />
    <circle cx="65" cy="28" r="4" />
    <circle cx="115" cy="28" r="4" />
  </svg>
);

const Arc = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" className="w-full">
    <path d="M90 15c-20 0-36 16-36 36h8c0-15 13-28 28-28s28 13 28 28h8c0-20-16-36-36-36z" />
  </svg>
);

const Raycast = () => (
  <svg viewBox="0 0 180 56" fill="currentColor" className="w-full">
    <rect x="60" y="18" width="60" height="4" />
    <rect x="60" y="26" width="60" height="4" />
    <rect x="60" y="34" width="60" height="4" />
    <circle cx="45" cy="28" r="6" />
  </svg>
);
