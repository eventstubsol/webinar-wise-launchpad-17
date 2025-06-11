
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const FinalCTASection = () => {
  return (
    <section className="py-16 px-4 bg-primary text-white">
      <div className="container mx-auto text-center max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to see what your webinars are really saying?
        </h2>
        <p className="text-xl mb-8 text-blue-100">
          No credit card. No setup hassle. Just insights.
        </p>
        <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-3">
          <Link to="/register">Get Started Free</Link>
        </Button>
      </div>
    </section>
  );
};
