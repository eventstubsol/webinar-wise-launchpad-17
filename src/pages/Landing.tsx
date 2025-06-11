
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { CheckCircle, Users, Video, BarChart } from "lucide-react";

const Landing = () => {
  const features = [
    {
      icon: Video,
      title: "HD Video Streaming",
      description: "Crystal clear video quality with adaptive streaming technology"
    },
    {
      icon: Users,
      title: "Unlimited Attendees",
      description: "Host webinars for audiences of any size without restrictions"
    },
    {
      icon: BarChart,
      title: "Real-time Analytics",
      description: "Track engagement, attendance, and performance metrics live"
    }
  ];

  const benefits = [
    "Easy-to-use interface that requires no technical expertise",
    "Reliable streaming infrastructure with 99.9% uptime",
    "Interactive features like Q&A, polls, and chat",
    "Automated recordings and email follow-ups",
    "Custom branding and white-label options",
    "24/7 customer support and onboarding assistance"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Host Professional Webinars
            <span className="text-primary block">That Convert</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The all-in-one platform for creating, hosting, and analyzing webinars 
            that engage your audience and drive business results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link to="/register">Start Free Trial</Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Successful Webinars
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From setup to follow-up, we've got every aspect of your webinar covered
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
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
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Choose Webinar Wise?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join thousands of professionals who trust us to deliver exceptional webinar experiences.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-600 mb-6">
                  Join thousands of successful webinar hosts already using our platform.
                </p>
                <Button asChild size="lg" className="w-full">
                  <Link to="/register">Create Your Account</Link>
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  Setup takes less than 2 minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-white">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Hosting Professional Webinars Today
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            No setup fees, no long-term contracts. Just powerful webinar hosting made simple.
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
