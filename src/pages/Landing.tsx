
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { Link } from "react-router-dom";
import { CheckCircle, Zap, Brain, BarChart3, FileText, Shield, Users, GraduationCap, Building, Briefcase, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const Landing = () => {
  const features = [
    {
      icon: Zap,
      title: "Sync Instantly with Zoom",
      description: "Pull in registrants, attendees, polls, and Q&A with one click. No exports. No mess."
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Spot trends, drop-offs, and engagement patterns — no analyst required."
    },
    {
      icon: BarChart3,
      title: "Interactive Dashboards",
      description: "Visualize attendance, engagement, and audience behavior in real time."
    },
    {
      icon: FileText,
      title: "Export Beautiful Reports",
      description: "Download branded PDFs, Excel workbooks, or raw CSVs — ready for stakeholders."
    },
    {
      icon: Shield,
      title: "Built for Security",
      description: "Powered by Supabase with secure authentication, access control, and privacy by design."
    }
  ];

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

  const bonusFeatures = [
    "CSV upload fallback (for users without Zoom OAuth)",
    "Mobile-ready dashboards",
    "Real-time sync status tracking",
    "Custom branding on all reports"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        
        <section>
          <div className="relative pt-24 md:pt-36">
            <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    to="/register"
                    className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300 dark:border-t-white/5 dark:shadow-zinc-950">
                    <span className="text-foreground text-sm">Introducing Webinar Wise Analytics</span>
                    <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
        
                  <h1 className="mt-8 max-w-4xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] font-bold text-gray-900">
                    Turn Zoom Webinar Chaos
                    <span className="text-primary block">into Clarity</span>
                  </h1>
                  <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-600">
                    Say goodbye to CSV headaches. Webinar Wise connects to Zoom, cleans your data, 
                    and delivers beautiful insights, dashboards, and reports — automatically.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                  <div className="bg-foreground/10 rounded-[14px] border p-0.5">
                    <Button
                      asChild
                      size="lg"
                      className="rounded-xl px-5 text-base">
                      <Link to="/register">
                        <span className="text-nowrap">Get Started Free</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5">
                    <a href="#demo">
                      <span className="text-nowrap">Watch Demo</span>
                    </a>
                  </Button>
                </AnimatedGroup>
                
                <p className="text-sm text-gray-500 mt-4">
                  No credit card. No setup hassle. Just insights.
                </p>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}>
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div
                  aria-hidden
                  className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                />
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1 ring-background bg-background">
                  <img
                    className="bg-background aspect-[15/8] relative rounded-2xl"
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop&crop=center"
                    alt="Webinar Analytics Dashboard Preview"
                    width="2700"
                    height="1440"
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>

        {/* Customer Logos Section */}
        <section className="bg-background pb-16 pt-16 md:pb-32">
          <div className="group relative m-auto max-w-5xl px-6">
            <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
              <a
                href="#customers"
                className="block text-sm duration-150 hover:opacity-75">
                <span>Trusted by Teams Everywhere</span>
                <ChevronRight className="ml-1 inline-block size-3" />
              </a>
            </div>
            <div className="group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:gap-x-16 sm:gap-y-14">
              <div className="flex">
                <div className="mx-auto h-8 w-16 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                  Company
                </div>
              </div>
              <div className="flex">
                <div className="mx-auto h-8 w-16 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                  Brand
                </div>
              </div>
              <div className="flex">
                <div className="mx-auto h-8 w-16 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                  Corp
                </div>
              </div>
              <div className="flex">
                <div className="mx-auto h-8 w-16 bg-gray-200 rounded flex items-center justify-center text-xs font-medium text-gray-600">
                  Inc
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Why Webinar Wise Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Webinar Wise?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Transform your Zoom webinar data into actionable business intelligence
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.slice(0, 3).map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-4xl mx-auto">
            {features.slice(3).map((feature, index) => (
              <Card key={index + 3} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Who's It For?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {targetAudience.map((audience, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <audience.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{audience.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-sm">
                    {audience.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Now Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Why Now?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Because you're spending hours cleaning data when you should be learning from it.
          </p>
          <p className="text-lg text-gray-700">
            Webinar Wise turns every Zoom event into a strategic advantage — instantly.
          </p>
        </div>
      </section>

      {/* Bonus Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Bonus Features
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bonusFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
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

      <Footer />
    </div>
  );
};

export default Landing;
