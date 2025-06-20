import EventList from "@/components/EventList";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-[#F9F6F0] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-[#F96521] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-pally-medium">Back to Home</span>
          </Link>
        </div>
        
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-pally-bold text-gray-900">Discover Events</h1>
          <p className="mt-2 text-xl text-gray-600">
            Find your next unforgettable experience
          </p>
        </div>
        
        {/* Event List */}
        <EventList />
      </div>
    </div>
  );
}
