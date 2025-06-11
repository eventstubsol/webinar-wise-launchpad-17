
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { CheckCircle, Zap, Brain, BarChart3, FileText, Shield, Users, GraduationCap, Building, Briefcase } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Turn Zoom Webinar Chaos
            <span className="text-primary block">into Clarity</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Say goodbye to CSV headaches. Webinar Wise connects to Zoom, cleans your data, 
            and delivers beautiful insights, dashboards, and reports — automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link to="/register">Get Started Free</Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No credit card. No setup hassle. Just insights.
          </p>
        </div>
      </section>

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
