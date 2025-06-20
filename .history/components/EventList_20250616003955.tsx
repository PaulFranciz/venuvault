"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import EventCard from "./EventCard";
import Spinner from "./Spinner";
import { 
  CalendarDays, 
  Ticket, 
  Search, 
  MapPin, 
  Clock,
  TrendingUp,
  Star
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SortOption = "date" | "popularity" | "price" | "name";
type FilterTab = "all" | "upcoming" | "trending" | "popular";

export default function EventList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch events data
  const { data: events, isLoading, error } = useEvents({
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Process and filter events
  const processedEvents = useMemo(() => {
    if (!events) return { upcoming: [], past: [], trending: [], popular: [] };

    const now = Date.now();
    
    // Separate upcoming and past events
    const upcoming = events
      .filter((event) => event.eventDate > now && !event.is_cancelled)
      .sort((a, b) => a.eventDate - b.eventDate);

    const past = events
      .filter((event) => event.eventDate <= now && !event.is_cancelled)
      .sort((a, b) => b.eventDate - a.eventDate);

    // Calculate trending events (recent activity + upcoming)
    const trending = upcoming
      .filter(event => {
        const daysUntilEvent = (event.eventDate - now) / (1000 * 60 * 60 * 24);
        const daysSinceCreated = (now - (event.createdAt || 0)) / (1000 * 60 * 60 * 24);
        return daysUntilEvent <= 30 && daysSinceCreated <= 14; // Events within 30 days, created in last 2 weeks
      })
      .sort((a, b) => {
        // Sort by a combination of recency and attendance
        const aScore = (a.attendeeCount || 0) + (a.createdAt || 0) / 1000000;
        const bScore = (b.attendeeCount || 0) + (b.createdAt || 0) / 1000000;
        return bScore - aScore;
      })
      .slice(0, 12);

    // Popular events (by attendance)
    const popular = upcoming
      .filter(event => (event.attendeeCount || 0) > 0)
      .sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0))
      .slice(0, 12);

    return { upcoming, past, trending, popular };
  }, [events]);

  // Apply search and location filters
  const filteredEvents = useMemo(() => {
    let eventsToFilter = [];
    
    switch (activeTab) {
      case "upcoming":
        eventsToFilter = processedEvents.upcoming;
        break;
      case "trending":
        eventsToFilter = processedEvents.trending;
        break;
      case "popular":
        eventsToFilter = processedEvents.popular;
        break;
      default:
        eventsToFilter = [...processedEvents.upcoming, ...processedEvents.past];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      eventsToFilter = eventsToFilter.filter(event =>
        event.name.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    }

    // Apply location filter
    if (selectedLocation) {
      eventsToFilter = eventsToFilter.filter(event =>
        event.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Apply sorting
    eventsToFilter.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return a.eventDate - b.eventDate;
        case "popularity":
          return (b.attendeeCount || 0) - (a.attendeeCount || 0);
        case "price":
          return (a.price || 0) - (b.price || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return a.eventDate - b.eventDate;
      }
    });

    return eventsToFilter;
  }, [processedEvents, activeTab, searchQuery, selectedLocation, sortBy]);

  // Get unique locations for filter dropdown
  const locations = useMemo(() => {
    if (!events) return [];
    const locationSet = new Set<string>();
    events.forEach(event => {
      const city = event.location.split(',')[0].trim();
      if (city) locationSet.add(city);
    });
    return Array.from(locationSet).sort();
  }, [events]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-600">Loading amazing events...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <CalendarDays className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to load events</h3>
          <p className="text-gray-600 mb-4">We're having trouble loading events right now.</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const hasActiveFilters = searchQuery || selectedLocation || sortBy !== "date";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Discover Events
            </h1>
            <p className="text-gray-600">
              Find and book tickets for amazing events happening near you
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <CalendarDays className="w-5 h-5" />
                <span className="font-medium">
                  {processedEvents.upcoming.length} Upcoming
                </span>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">
                  {processedEvents.trending.length} Trending
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search events, locations, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full text-base"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[180px]">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">
                    <Clock className="w-4 h-4 mr-2 inline" />
                    Date
                  </SelectItem>
                  <SelectItem value="popularity">
                    <Star className="w-4 h-4 mr-2 inline" />
                    Popularity
                  </SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedLocation("");
                    setSortBy("date");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            
          </div>
        </div>
      </div>

      {/* Event Tabs */}
             <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)} className="mb-8">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            All Events
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="popular" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Popular
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Filtered
                </Badge>
              )}
            </p>
          </div>

                     {/* Events Grid */}
           {filteredEvents.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                             {filteredEvents.map((event) => (
                 <EventCard 
                   key={event._id} 
                   eventId={event._id}
                 />
               ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full p-8 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No events found
                </h3>
                <p className="text-gray-600 mb-6">
                  {hasActiveFilters 
                    ? "Try adjusting your search criteria or filters to find more events."
                    : "There are no events available at the moment. Check back later!"
                  }
                </p>
                {hasActiveFilters && (
                  <Button 
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedLocation("");
                      setSortBy("date");
                    }}
                    variant="outline"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Hook to use events with caching (keeping the existing hook)
function useEvents(options: { staleTime?: number; enabled?: boolean } = {}) {
  const events = useQuery(api.events.get, {});
  
  return {
    data: events,
    isLoading: events === undefined,
    error: null // For now, we'll handle errors at the component level
  };
}
