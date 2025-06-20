"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import EventCard from '@/components/EventCard';
import { Search, Filter, Calendar, MapPin, Tag, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Spinner from '@/components/Spinner';

interface EventDiscoveryProps {
  userId?: string;
}

export default function EventDiscovery({ userId }: EventDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'popularity'>('date');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all events
  const events = useQuery(api.eventDiscovery.searchEvents, {}) || { events: [], total: 0, hasMore: false };
  
  // Fetch categories for filtering
  const categories = useQuery(api.eventDiscovery.getCategories, {
    includeInactive: false,
    parentOnly: true
  }) || [];

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events.events.filter((event: any) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.name.toLowerCase().includes(query) && 
            !event.description?.toLowerCase().includes(query) &&
            !event.location.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Filter by category
      if (selectedCategory && event.categoryId !== selectedCategory) {
        return false;
      }

      // Filter by location
      if (selectedLocation && !event.location.toLowerCase().includes(selectedLocation.toLowerCase())) {
        return false;
      }

      // Only show future events
      return event.eventDate > Date.now();
    });

    // Sort events
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'date':
          return a.eventDate - b.eventDate;
        case 'price':
          return (a.price || 0) - (b.price || 0);
        case 'popularity':
          return (b.attendeeCount || 0) - (a.attendeeCount || 0);
        default:
          return a.eventDate - b.eventDate;
      }
    });

    return filtered;
  }, [events, searchQuery, selectedCategory, selectedLocation, sortBy]);

  // Get unique locations from events
  const locations = useMemo(() => {
    const locationSet = new Set<string>();
    events.events.forEach((event: any) => {
      const city = event.location.split(',')[0].trim();
      locationSet.add(city);
    });
    return Array.from(locationSet);
  }, [events]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSortBy('date');
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedLocation || sortBy !== 'date';

  if (!events || !events.events) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search events, locations, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[searchQuery, selectedCategory, selectedLocation, sortBy !== 'date' ? 'sorted' : ''].filter(Boolean).length}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-gray-500">
                Clear filters
              </Button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Category
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Sort by
                </label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="popularity">Popularity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
        </p>
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event: any) => (
            <EventCard key={event._id} eventId={event._id} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or filters to find more events.
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">
                Clear all filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 