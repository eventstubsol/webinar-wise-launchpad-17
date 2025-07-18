
import React from "react";
import { Link } from "react-router-dom";
import { 
  Brain, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Github, 
  Instagram,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import type { BaseComponentProps } from "@/types";

export const Footer = ({ className }: BaseComponentProps) => {
  return (
    <footer className={`relative bg-gradient-to-br from-white via-gray-50 to-gray-100 pt-32 pb-12 overflow-hidden ${className}`}>
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 max-w-7xl mx-auto">
          <div className="group">
            <div className="flex items-center mb-8">
              <img 
                src="/lovable-uploads/3c2a8db7-3750-4dc1-a7b7-f17ec71a02ff.png" 
                alt="WebinarWise Logo"
                className="h-18 w-auto group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <p className="text-gray-600 leading-relaxed mb-8">
              Transform your Zoom webinar data into actionable business intelligence with professional analytics and insights.
            </p>
            <div className="flex space-x-4">
              {[
                { icon: Facebook, href: "#" },
                { icon: Twitter, href: "#" },
                { icon: Linkedin, href: "#" },
                { icon: Github, href: "#" },
                { icon: Instagram, href: "#" }
              ].map((social, idx) => (
                <a 
                  key={idx}
                  href={social.href} 
                  className="w-10 h-10 rounded-xl bg-white/90 border border-black/10 flex items-center justify-center text-gray-600 hover:bg-gradient-to-br hover:from-blue-500 hover:to-purple-500 hover:text-white hover:border-transparent transition-all duration-300 shadow-sm hover:shadow-lg"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold tracking-tight mb-6 bg-gradient-to-r from-black via-gray-800 to-gray-600 bg-clip-text text-transparent">Product</h4>
            <ul className="space-y-4">
              {[
                { name: "Features", href: "/" },
                { name: "Analytics Dashboard", href: "/" },
                { name: "Export Reports", href: "/" },
                { name: "Zoom Integration", href: "/" },
                { name: "Data Insights", href: "/" }
              ].map((item, idx) => (
                <li key={idx}>
                  <Link to={item.href} className="text-gray-600 hover:text-black transition-colors duration-300 flex items-center group">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold tracking-tight mb-6 bg-gradient-to-r from-black via-gray-800 to-gray-600 bg-clip-text text-transparent">Company</h4>
            <ul className="space-y-4">
              {[
                { name: "About", href: "/" },
                { name: "Blog", href: "/" },
                { name: "Careers", href: "/" },
                { name: "Contact", href: "/" },
                { name: "Privacy Policy", href: "/privacy-policy" },
                { name: "Terms of Service", href: "/terms" }
              ].map((item, idx) => (
                <li key={idx}>
                  <Link to={item.href} className="text-gray-600 hover:text-black transition-colors duration-300 flex items-center group">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold tracking-tight mb-6 bg-gradient-to-r from-black via-gray-800 to-gray-600 bg-clip-text text-transparent">Support</h4>
            <ul className="space-y-4">
              <li className="text-gray-600 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                San Francisco, CA
              </li>
              <li>
                <a href="mailto:support@webinarwise.com" className="text-gray-600 hover:text-black transition-colors duration-300 flex items-center group">
                  <Mail className="w-5 h-5 mr-2 text-gray-400" />
                  support@webinarwise.com
                </a>
              </li>
              <li>
                <Link to="/" className="text-gray-600 hover:text-black transition-colors duration-300 flex items-center group">
                  <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/" className="text-gray-600 hover:text-black transition-colors duration-300 flex items-center group">
                  <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Documentation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-black/10 text-center">
          <p className="text-gray-500 text-sm font-medium">
            © {new Date().getFullYear()} Webinar Wise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
