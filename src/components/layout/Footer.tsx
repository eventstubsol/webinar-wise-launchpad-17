
import { Link } from "react-router-dom";
import type { BaseComponentProps } from "@/types";

export const Footer = ({ className }: BaseComponentProps) => {
  return (
    <footer className={`bg-gray-50 border-t ${className}`}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WW</span>
              </div>
              <span className="font-semibold text-xl">Webinar Wise</span>
            </div>
            <p className="text-gray-600 text-sm">
              Professional webinar hosting platform for seamless virtual events.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/" className="hover:text-gray-900">Features</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Pricing</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Integrations</Link></li>
              <li><Link to="/" className="hover:text-gray-900">API</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/" className="hover:text-gray-900">About</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Blog</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Careers</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/" className="hover:text-gray-900">Help Center</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Documentation</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Community</Link></li>
              <li><Link to="/" className="hover:text-gray-900">Status</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
          <p>&copy; 2024 Webinar Wise. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
