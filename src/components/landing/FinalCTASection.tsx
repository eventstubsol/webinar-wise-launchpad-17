
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BackgroundBeams } from "@/components/ui/background-beams";

export const FinalCTASection = () => {
  return (
    <section className="h-[40rem] w-full rounded-md bg-background relative flex flex-col items-center justify-center antialiased">
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground text-center font-sans font-bold">
          Ready to see what your webinars are really saying?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto my-2 text-sm text-center relative z-10">
          No credit card. No setup hassle. Just insights.
        </p>
        <div className="w-full flex justify-center mt-4 relative z-10">
          <Button asChild size="lg" className="text-lg px-8 py-3">
            <Link to="/register">Get Started Free</Link>
          </Button>
        </div>
      </div>
      <BackgroundBeams />
    </section>
  );
};
