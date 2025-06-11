
import { ChevronRight } from "lucide-react";

export const CustomerLogosSection = () => {
  return (
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
  );
};
