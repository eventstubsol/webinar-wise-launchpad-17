
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/supabase";
import { Plus, Calendar, Users, Video, TrendingUp } from "lucide-react";
import type { User, Webinar } from "@/types";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadWebinars();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await auth.getCurrentUser();
      if (error || !user) {
        navigate('/login');
        return;
      }
      setUser(user as User);
    } catch (error) {
      navigate('/login');
    }
  };

  const loadWebinars = async () => {
    try {
      const { data, error } = await db.getWebinars();
      if (error) throw error;
      setWebinars(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load webinars",
        description: "Please try refreshing the page.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "Please try again.",
      });
    }
  };

  const stats = [
    {
      title: "Total Webinars",
      value: webinars.length,
      icon: Video,
      color: "text-blue-600"
    },
    {
      title: "Scheduled",
      value: webinars.filter(w => w.status === 'scheduled').length,
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "Total Registrations",
      value: "0", // This would come from actual registration data
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Engagement Rate",
      value: "0%", // This would be calculated from analytics
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header isAuthenticated onSignOut={handleSignOut} />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isAuthenticated onSignOut={handleSignOut} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name || user?.email}!
          </h1>
          <p className="text-gray-600">
            Manage your webinars and track your performance from your dashboard.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Webinars</CardTitle>
                  <CardDescription>
                    Your latest webinar activities
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Webinar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webinars.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No webinars yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first webinar to get started with hosting.
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Webinar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {webinars.slice(0, 3).map((webinar) => (
                    <div key={webinar.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{webinar.title}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(webinar.scheduled_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          webinar.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                          webinar.status === 'live' ? 'bg-blue-100 text-blue-800' :
                          webinar.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {webinar.status}
                        </span>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Webinar
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="w-4 h-4 mr-2" />
                View Registrations
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics Report
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Video className="w-4 h-4 mr-2" />
                Test Your Setup
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>
              Your scheduled webinars for the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No upcoming events scheduled</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
