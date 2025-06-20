"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import EventCard from '@/components/EventCard';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Tag, 
  SlidersHorizontal,
  TrendingUp,
  Star,
  Clock,
  Users,
  Zap,
  ChevronDown,
  Grid3X3,
  List,
  Heart,
  Share2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import Spinner from '@/components/Spinner';

interface EventDiscoveryProps {
  userId?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'date' | 'popularity' | 'price' | 'name' | 'distance';
type FilterTab = 'all' | 'upcoming' | 'trending' | 'popular' | 'nearby';

export default function EventDiscovery({ userId }: EventDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Fetch events using the basic events query
  const eventsData = useQuery(api.events.get, {});
  const events = eventsData || [];

  // Process events into categories
  const processedEvents = useMemo(() => {
    if (!events.length) return { upcoming: [], past: [], trending: [], popular: [], nearby: [] };

    const now = Date.now();
    
    // Separate upcoming and past events
    const upcoming = events
      .filter((event: any) => event.eventDate > now && !event.is_cancelled)
      .sort((a: any, b: any) => a.eventDate - b.eventDate);

    const past = events
      .filter((event: any) => event.eventDate <= now && !event.is_cancelled)
      .sort((a: any, b: any) => b.eventDate - a.eventDate);

    // Calculate trending events (recent activity + upcoming)
    const trending = upcoming
      .filter((event: any) => {
        const daysUntilEvent = (event.eventDate - now) / (1000 * 60 * 60 * 24);
        const daysSinceCreated = (now - (event.createdAt || 0)) / (1000 * 60 * 60 * 24);
        return daysUntilEvent <= 30 && daysSinceCreated <= 14;
      })
      .sort((a: any, b: any) => {
        const aScore = (a.attendeeCount || 0) + (a.createdAt || 0) / 1000000;
        const bScore = (b.attendeeCount || 0) + (b.createdAt || 0) / 1000000;
        return bScore - aScore;
      })
      .slice(0, 12);

    // Popular events (by attendance)
    const popular = upcoming
      .filter((event: any) => (event.attendeeCount || 0) > 0)
      .sort((a: any, b: any) => (b.attendeeCount || 0) - (a.attendeeCount || 0))
      .slice(0, 12);

    // Nearby events (for now, just use all upcoming events)
    const nearby = upcoming.slice(0, 8);

    return { upcoming, past, trending, popular, nearby };
  }, [events]);

  // Apply filters and search
  const filteredEvents = useMemo(() => {
    let eventsToFilter: any[] = [];
    
    switch (activeTab) {
      case 'upcoming':
        eventsToFilter = processedEvents.upcoming;
        break;
      case 'trending':
        eventsToFilter = processedEvents.trending;
        break;
      case 'popular':
        eventsToFilter = processedEvents.popular;
        break;
      case 'nearby':
        eventsToFilter = processedEvents.nearby;
        break;
      default:
        eventsToFilter = [...processedEvents.upcoming, ...processedEvents.past];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      eventsToFilter = eventsToFilter.filter((event: any) =>
        event.name?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }

    // Apply location filter
    if (selectedLocation) {
      eventsToFilter = eventsToFilter.filter((event: any) =>
        event.location?.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory) {
      eventsToFilter = eventsToFilter.filter((event: any) =>
        event.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Apply price range filter
    if (priceRange.min || priceRange.max) {
      eventsToFilter = eventsToFilter.filter((event: any) => {
        const price = event.price || 0;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Apply sorting
    eventsToFilter.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date':
          return a.eventDate - b.eventDate;
        case 'popularity':
          return (b.attendeeCount || 0) - (a.attendeeCount || 0);
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return a.eventDate - b.eventDate;
      }
    });

    return eventsToFilter;
  }, [processedEvents, activeTab, searchQuery, selectedLocation, selectedCategory, priceRange, sortBy]);

  // Get unique locations for filter dropdown
  const locations = useMemo(() => {
    const locationSet = new Set<string>();
    events.forEach((event: any) => {
      if (event.location) {
        const city = event.location.split(',')[0].trim();
        if (city) locationSet.add(city);
      }
    });
    return Array.from(locationSet).sort();
  }, [events]);

  // Get unique categories
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    events.forEach((event: any) => {
      if (event.category) categorySet.add(event.category);
    });
    return Array.from(categorySet).sort();
  }, [events]);

  const hasActiveFilters = searchQuery || selectedLocation || selectedCategory || priceRange.min || priceRange.max || sortBy !== 'date';

  if (!events) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80"></div>
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium">Discover Amazing Events</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-tight">
              Find Your Next
              <br />
              <span className="text-yellow-300">Adventure</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-12 leading-relaxed max-w-3xl mx-auto">
              From intimate concerts to massive festivals, discover events that match your vibe and create unforgettable memories
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-2 shadow-2xl">
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        type="text"
                        placeholder="Search events, artists, venues..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-4 py-4 text-lg border-0 bg-transparent focus:ring-0 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger className="w-[180px] border-0 bg-gray-50 rounded-2xl">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          <SelectValue placeholder="Location" />
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
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-4 rounded-2xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                        Search
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-200" />
                  <div className="text-2xl font-bold">{processedEvents.upcoming.length}</div>
                  <div className="text-blue-200 text-sm">Upcoming</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-orange-200" />
                  <div className="text-2xl font-bold">{processedEvents.trending.length}</div>
                  <div className="text-blue-200 text-sm">Trending</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <Star className="w-8 h-8 mx-auto mb-2 text-yellow-200" />
                  <div className="text-2xl font-bold">{processedEvents.popular.length}</div>
                  <div className="text-blue-200 text-sm">Popular</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-green-200" />
                  <div className="text-2xl font-bold">{processedEvents.nearby.length}</div>
                  <div className="text-blue-200 text-sm">Nearby</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Advanced Filters */}
        <Card className="mb-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-3 flex-1">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px] rounded-xl border-gray-200">
                    <Tag className="w-4 h-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-[160px] rounded-xl border-gray-200">
                    <SlidersHorizontal className="w-4 h-4 mr-2 text-gray-500" />
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
                      setSearchQuery('');
                      setSelectedLocation('');
                      setSelectedCategory('');
                      setPriceRange({ min: '', max: '' });
                      setSortBy('date');
                    }}
                    className="rounded-xl"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="rounded-xl"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </Button>

                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-lg"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-lg"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Min" 
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="rounded-xl" 
                      />
                      <Input 
                        placeholder="Max" 
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="rounded-xl" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <Input 
                      type="date" 
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="rounded-xl" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <Input 
                      type="date" 
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="rounded-xl" 
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Categories Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterTab)} className="mb-8">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
            <TabsTrigger 
              value="upcoming" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger 
              value="trending" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger 
              value="popular" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              <Star className="w-4 h-4 mr-2" />
              Popular
            </TabsTrigger>
            <TabsTrigger 
              value="nearby" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Nearby
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-700 data-[state=active]:text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-8">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {activeTab === 'upcoming' && 'Upcoming Events'}
                  {activeTab === 'trending' && 'Trending Events'}
                  {activeTab === 'popular' && 'Popular Events'}
                  {activeTab === 'nearby' && 'Events Near You'}
                  {activeTab === 'all' && 'All Events'}
                </h2>
                <p className="text-gray-600 mt-2 flex items-center gap-2">
                  <span>{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="rounded-full">
                      Filtered
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            {/* Events Grid/List */}
            {filteredEvents.length > 0 ? (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                  : "space-y-6"
              }>
                {filteredEvents.map((event: any) => (
                  <div key={event._id} className="group">
                    <EventCard eventId={event._id} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full p-12 w-40 h-40 mx-auto mb-8 flex items-center justify-center">
                    <Search className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    No events found
                  </h3>
                  <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                    {hasActiveFilters 
                      ? "We couldn't find any events matching your criteria. Try adjusting your filters or search terms."
                      : "There are no events available at the moment. Check back soon for exciting new events!"
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedLocation('');
                        setSelectedCategory('');
                        setPriceRange({ min: '', max: '' });
                        setSortBy('date');
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl px-8 py-3 text-lg"
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