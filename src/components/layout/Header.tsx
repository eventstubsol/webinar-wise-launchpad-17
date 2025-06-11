
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import type { BaseComponentProps } from "@/types";

interface HeaderProps extends BaseComponentProps {
  isAuthenticated?: boolean;
  onSignOut?: () => void;
}

export const Header = ({ className, isAuthenticated = false, onSignOut }: HeaderProps) => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    onSignOut?.();
    navigate('/');
  };

  return (
    <header className={`border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">WW</span>
          </div>
          <span className="font-semibold text-xl text-gray-900">Webinar Wise</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium">
            Features
          </Link>
          <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium">
            Pricing
          </Link>
          <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium">
            Documentation
          </Link>
          <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium">
            Community
          </Link>
          {isAuthenticated && (
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
              Dashboard
            </Link>
          )}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-600 hover:text-gray-900">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md">
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
