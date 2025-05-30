"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CircleX, CalendarPlus } from "lucide-react";
import Image from "next/image";

export default function NoSellerAccess() {
  const router = useRouter();

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-12 bg-gray-50">
      {/* Desktop layout with image on the right */}
      <div className="max-w-7xl w-full hidden md:flex rounded-xl shadow-xl overflow-hidden">
        <div className="w-1/2 bg-white p-14 flex flex-col justify-center">
          <div className="max-w-xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-[#502413]">Creator Studio Access</h1>
            
            <div className="space-y-4 mb-8">
              <p className="text-gray-700 text-lg">
                You don't have access to the Creator Studio yet. To unlock this feature, you need to publish at least one event on Ticwaka.
              </p>
              <p className="text-gray-700 text-lg">
                Publishing an event allows you to access powerful tools for event management, analytics, and ticketing.
              </p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={() => router.push("/create-event")}
                className="w-full bg-[#F96521] hover:bg-[#e55511] text-white font-semibold py-4 h-auto text-lg"
              >
                Create Your First Event
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push("/")}
                className="w-full border-[#502413] text-[#502413] hover:bg-[#502413]/5 py-4 h-auto text-lg"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
        
        {/* Image section - right side */}
        <div className="w-1/2 bg-[#502413] flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-[url('/images/noise.png')] bg-repeat"></div>
          </div>
          
          {/* Placeholder illustration - can be replaced with actual image later */}
          <div className="relative z-10 text-center p-8">
            <div className="w-56 h-56 rounded-full bg-[#F96521]/20 flex items-center justify-center mx-auto mb-8">
              <CalendarPlus className="h-28 w-28 text-[#F96521]" />
            </div>
            <h3 className="text-3xl font-semibold text-white mb-4">Unlock Creator Tools</h3>
            <p className="text-white/80 max-w-sm mx-auto text-lg">
              Create and publish your first event to access analytics, ticketing, and management tools.  
            </p>
          </div>
        </div>
      </div>
      
      {/* Mobile layout */}
      <div className="md:hidden max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
        {/* Placeholder for illustration - will be replaced later */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-[#F96521]/20 flex items-center justify-center">
            <CalendarPlus className="h-12 w-12 text-[#F96521]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4 text-[#502413]">Creator Studio Access</h1>
        
        <div className="space-y-4 mb-8">
          <p className="text-gray-700">
            You don't have access to the Creator Studio yet. To unlock this feature, you need to publish at least one event on Ticwaka.
          </p>
          <p className="text-gray-700">
            Publishing an event allows you to access powerful tools for event management, analytics, and ticketing.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => router.push("/create-event")}
            className="w-full bg-[#F96521] hover:bg-[#e55511] text-white font-semibold"
          >
            Create Your First Event
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push("/")}
            className="w-full border-[#502413] text-[#502413] hover:bg-[#502413]/5"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
