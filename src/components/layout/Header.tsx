
import React from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BaseComponentProps } from "@/types";

interface HeaderProps extends BaseComponentProps {
  isAuthenticated?: boolean;
  onSignOut?: () => void;
}

const menuItems = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'Documentation', href: '#docs' },
  { name: 'Community', href: '#community' },
];

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">WW</span>
      </div>
      <span className="font-semibold text-xl" style={{ color: '#0f172a' }}>Webinar Wise</span>
    </div>
  );
};

export const Header = ({ className, isAuthenticated = false, onSignOut }: HeaderProps) => {
  const navigate = useNavigate();
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const handleSignOut = () => {
    onSignOut?.();
    navigate('/');
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className="fixed z-20 w-full px-2 group">
        <div className={cn(
          'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', 
          isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5'
        )}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                to="/"
                aria-label="home"
                className="flex items-center space-x-2">
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      className="hover:text-accent-foreground block duration-150"
                      style={{ color: '#0f172a' }}>
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
                {isAuthenticated && (
                  <li>
                    <Link
                      to="/dashboard"
                      className="hover:text-accent-foreground block duration-150"
                      style={{ color: '#0f172a' }}>
                      <span>Dashboard</span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        className="hover:text-accent-foreground block duration-150"
                        style={{ color: '#0f172a' }}>
                        <span>{item.name}</span>
                      </a>
                    </li>
                  ))}
                  {isAuthenticated && (
                    <li>
                      <Link
                        to="/dashboard"
                        className="hover:text-accent-foreground block duration-150"
                        style={{ color: '#0f172a' }}>
                        <span>Dashboard</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                {isAuthenticated ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className={cn(isScrolled && 'lg:hidden')}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={cn(isScrolled && 'lg:hidden')}>
                      <Link to="/login">
                        <span>Login</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className={cn(isScrolled && 'lg:hidden')}>
                      <Link to="/register">
                        <span>Sign Up</span>
                      </Link>
                    </Button>
                  </>
                )}
                <Button
                  asChild
                  size="sm"
                  className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                  <Link to="/register">
                    <span>Get Started</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
