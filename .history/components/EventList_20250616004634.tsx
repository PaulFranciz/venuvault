"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import EventCard from "./EventCard";
import Spinner from "./Spinner";
import { 
  CalendarDays, 
  Search, 
  MapPin, 
  Clock,
  TrendingUp,
  Star,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Users,
  Zap
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
  const [activeTab, setActiveTab] = useState<FilterTab>("upcoming");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
        return daysUntilEvent <= 30 && daysSinceCreated <= 14;
      })
      .sort((a, b) => {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative">
              <Spinner />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900">Discovering amazing events...</h3>
            <p className="mt-2 text-gray-600">Finding the best experiences just for you</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-50 rounded-full p-6 w-20 h-20 flex items-center justify-center mb-6">
              <CalendarDays className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Unable to load events</h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">We're having trouble connecting to our servers. Please check your connection and try again.</p>
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = searchQuery || selectedLocation || sortBy !== "date";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Discover Events
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Find and book tickets for the most amazing events happening around you
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Input
                  type="text"
                  placeholder="Search events, artists, venues, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-4 w-full text-lg bg-white/95 backdrop-blur-sm border-0 rounded-2xl shadow-xl focus:shadow-2xl transition-all duration-300 focus:ring-4 focus:ring-white/30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 -z-10"></div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-6 h-6 text-blue-200" />
                  <div>
                    <div className="text-2xl font-bold">{processedEvents.upcoming.length}</div>
                    <div className="text-blue-200 text-sm">Upcoming Events</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-yellow-200" />
                  <div>
                    <div className="text-2xl font-bold">{processedEvents.trending.length}</div>
                    <div className="text-blue-200 text-sm">Trending Now</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-green-200" />
                  <div>
                    <div className="text-2xl font-bold">{processedEvents.popular.length}</div>
                    <div className="text-blue-200 text-sm">Popular Events</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Advanced Filters */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 flex-1">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[200px] rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[160px] rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20">
                  <SlidersHorizontal className="w-4 h-4 mr-2 text-gray-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
                  className="rounded-xl border-gray-200 hover:bg-gray-50"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="rounded-xl border-gray-200 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              More Filters
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {showAdvancedFilters && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                  <div className="flex gap-2">
                    <Input placeholder="Min" className="rounded-xl" />
                    <Input placeholder="Max" className="rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <Input type="date" className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <Select>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="arts">Arts & Theater</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Categories Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)} className="mb-8">
          <TabsList className="grid w-full grid-cols-4 bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
            <TabsTrigger 
              value="upcoming" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Clock className="w-4 h-4 mr-2" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger 
              value="trending" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger 
              value="popular" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Star className="w-4 h-4 mr-2" />
              Popular
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-700 data-[state=active]:text-white transition-all duration-300"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              All Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-8">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeTab === "upcoming" && "Upcoming Events"}
                  {activeTab === "trending" && "Trending Events"}
                  {activeTab === "popular" && "Popular Events"}
                  {activeTab === "all" && "All Events"}
                </h2>
                <p className="text-gray-600 mt-1">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 rounded-full">
                      Filtered
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            {/* Events Grid */}
            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredEvents.map((event) => (
                  <div key={event._id} className="group">
                    <EventCard eventId={event._id} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full p-8 w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                    <Search className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    No events found
                  </h3>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    {hasActiveFilters 
                      ? "We couldn't find any events matching your criteria. Try adjusting your filters or search terms."
                      : "There are no events available at the moment. Check back soon for exciting new events!"
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button 
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedLocation("");
                        setSortBy("date");
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl"
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
    </div>
  );
}

// Hook to use events with caching
function useEvents(options: { staleTime?: number; enabled?: boolean } = {}) {
  const events = useQuery(api.events.get, {});
  
  return {
    data: events,
    isLoading: events === undefined,
    error: null
  };
}
