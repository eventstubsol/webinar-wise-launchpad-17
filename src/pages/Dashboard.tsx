
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { LogOut, User } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user?.email}
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to your Dashboard
          </h2>
          <p className="text-gray-600 mb-6">
            You are successfully authenticated! This is a protected area that requires login.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Info</h3>
              <p className="text-gray-600">Email: {user?.email}</p>
              <p className="text-gray-600">ID: {user?.id}</p>
              <p className="text-gray-600">
                Email Verified: {user?.email_confirmed_at ? 'Yes' : 'No'}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  Update Profile
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  Change Password
                </Button>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Features</h3>
              <p className="text-gray-600 text-sm">
                More features will be added here as the application grows.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
