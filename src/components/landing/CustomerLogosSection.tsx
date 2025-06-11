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
