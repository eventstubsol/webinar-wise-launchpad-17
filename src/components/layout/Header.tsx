
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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">WW</span>
          </div>
          <span className="font-semibold text-xl">Webinar Wise</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Button asChild size="sm">
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
