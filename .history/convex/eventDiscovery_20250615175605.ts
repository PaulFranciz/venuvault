import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Event Categories and Tags System
export const createCategory = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    parentCategoryId: v.optional(v.id("eventCategories")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const categoryId = await ctx.db.insert("eventCategories", {
      ...args,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });

    return categoryId;
  },
});

export const getCategories = query({
  args: {
    includeInactive: v.optional(v.boolean()),
    parentOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let categories = await ctx.db.query("eventCategories").collect();

    if (!args.includeInactive) {
      categories = categories.filter(c => c.isActive);
    }

    if (args.parentOnly) {
      categories = categories.filter(c => !c.parentCategoryId);
    }

    // Build hierarchy
    const categoryMap = new Map(categories.map(c => [c._id, { ...c, children: [] as any[] }]));
    const rootCategories: any[] = [];

    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category._id)!;
      
      if (category.parentCategoryId) {
        const parent = categoryMap.get(category.parentCategoryId);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  },
});

export const addTagsToEvent = mutation({
  args: {
    eventId: v.id("events"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Normalize tags (lowercase, trim)
    const normalizedTags = args.tags.map(tag => tag.toLowerCase().trim());
    
    // Get existing tags or initialize empty array
    const existingTags = event.tags || [];
    
    // Merge and deduplicate
    const allTags = [...new Set([...existingTags, ...normalizedTags])];

    await ctx.db.patch(args.eventId, {
      tags: allTags,
    });

    return allTags;
  },
});

// Advanced Search & Filtering
export const searchEvents = query({
  args: {
    query: v.optional(v.string()),
    location: v.optional(v.string()),
    categoryId: v.optional(v.id("eventCategories")),
    tags: v.optional(v.array(v.string())),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    priceRange: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    sortBy: v.optional(v.union(
      v.literal("date"),
      v.literal("price"),
      v.literal("popularity"),
      v.literal("relevance"),
      v.literal("created")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let events = await ctx.db.query("events").collect();

    // Filter by search query (name, description)
    if (args.query) {
      const searchTerm = args.query.toLowerCase();
      events = events.filter(event => 
        event.name.toLowerCase().includes(searchTerm) ||
        (event.description && event.description.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by location
    if (args.location) {
      const locationTerm = args.location.toLowerCase();
      events = events.filter(event => 
        event.location.toLowerCase().includes(locationTerm)
      );
    }

    // Filter by category
    if (args.categoryId) {
      events = events.filter(event => event.categoryId === args.categoryId);
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      const searchTags = args.tags.map(tag => tag.toLowerCase());
      events = events.filter(event => {
        const eventTags = event.tags || [];
        return searchTags.some(tag => eventTags.includes(tag));
      });
    }

    // Filter by date range
    if (args.dateRange) {
      events = events.filter(event => 
        event.eventDate >= args.dateRange!.start && 
        event.eventDate <= args.dateRange!.end
      );
    }

    // Filter by price range
    if (args.priceRange) {
      events = events.filter(event => 
        event.price >= args.priceRange!.min && 
        event.price <= args.priceRange!.max
      );
    }

    // Sort events
    const sortBy = args.sortBy || "date";
    const sortOrder = args.sortOrder || "asc";

    events.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "date":
          comparison = a.eventDate - b.eventDate;
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "popularity":
          // This would need actual popularity metrics
          comparison = (b.attendeeCount || 0) - (a.attendeeCount || 0);
          break;
        case "created":
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
        case "relevance":
          // For now, use creation date as relevance
          comparison = (b.createdAt || 0) - (a.createdAt || 0);
          break;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 20;
    const paginatedEvents = events.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      total: events.length,
      hasMore: offset + limit < events.length,
    };
  },
});

// Event Recommendations
export const getRecommendedEvents = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    excludeEventIds: v.optional(v.array(v.id("events"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // Get user's event history and preferences
    const userTickets = await ctx.db
      .query("tickets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const userEvents = await Promise.all(
      userTickets.map(ticket => ctx.db.get(ticket.eventId))
    );

    // Extract user preferences from past events
    const userCategories = new Map<string, number>();
    const userTags = new Map<string, number>();
    const userLocations = new Map<string, number>();

    userEvents.forEach(event => {
      if (!event) return;

      // Count categories
      if (event.categoryId) {
        const count = userCategories.get(event.categoryId) || 0;
        userCategories.set(event.categoryId, count + 1);
      }

      // Count tags
      if (event.tags) {
        event.tags.forEach(tag => {
          const count = userTags.get(tag) || 0;
          userTags.set(tag, count + 1);
        });
      }

      // Count locations (simplified - just city)
      const location = event.location.split(',')[0].trim();
      const count = userLocations.get(location) || 0;
      userLocations.set(location, count + 1);
    });

    // Get all available events
    let allEvents = await ctx.db.query("events").collect();

    // Filter out excluded events
    if (args.excludeEventIds) {
      allEvents = allEvents.filter(event => 
        !args.excludeEventIds!.includes(event._id)
      );
    }

    // Filter out past events
    const now = Date.now();
    allEvents = allEvents.filter(event => event.eventDate > now);

    // Score events based on user preferences
    const scoredEvents = allEvents.map(event => {
      let score = 0;

      // Category match
      if (event.categoryId && userCategories.has(event.categoryId)) {
        score += userCategories.get(event.categoryId)! * 3;
      }

      // Tag matches
      if (event.tags) {
        event.tags.forEach(tag => {
          if (userTags.has(tag)) {
            score += userTags.get(tag)! * 2;
          }
        });
      }

      // Location match
      const eventLocation = event.location.split(',')[0].trim();
      if (userLocations.has(eventLocation)) {
        score += userLocations.get(eventLocation)! * 1;
      }

      // Boost newer events slightly
      const daysSinceCreated = (now - (event.createdAt || 0)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        score += 1;
      }

      return { ...event, recommendationScore: score };
    });

    // Sort by score and return top recommendations
    scoredEvents.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return scoredEvents.slice(0, limit);
  },
});

// Popular/Trending Events
export const getTrendingEvents = query({
  args: {
    timeframe: v.optional(v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    )),
    limit: v.optional(v.number()),
    categoryId: v.optional(v.id("eventCategories")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const timeframe = args.timeframe || "week";
    
    // Calculate timeframe in milliseconds
    const now = Date.now();
    const timeframes = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    const timeframeMs = timeframes[timeframe];
    const startTime = now - timeframeMs;

    // Get events
    let events = await ctx.db.query("events").collect();

    // Filter by category if specified
    if (args.categoryId) {
      events = events.filter(event => event.categoryId === args.categoryId);
    }

    // Filter out past events
    events = events.filter(event => event.eventDate > now);

    // Get recent ticket sales for trending calculation
    const recentTickets = await ctx.db
      .query("tickets")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    // Calculate trending scores
    const eventTicketCounts = new Map<string, number>();
    recentTickets.forEach(ticket => {
      const count = eventTicketCounts.get(ticket.eventId) || 0;
      eventTicketCounts.set(ticket.eventId, count + 1);
    });

    const trendingEvents = events.map(event => {
      const recentTicketSales = eventTicketCounts.get(event._id) || 0;
      const totalTicketSales = event.attendeeCount || 0;
      
      // Calculate trending score based on recent activity
      let trendingScore = recentTicketSales * 10; // Recent sales weighted heavily
      
      // Add bonus for events with good overall sales
      if (totalTicketSales > 0) {
        trendingScore += Math.log(totalTicketSales + 1) * 2;
      }

      // Add bonus for events happening soon (urgency factor)
      const daysUntilEvent = (event.eventDate - now) / (1000 * 60 * 60 * 24);
      if (daysUntilEvent <= 7) {
        trendingScore += (7 - daysUntilEvent) * 0.5;
      }

      // Add bonus for recently created events
      const daysSinceCreated = (now - (event.createdAt || 0)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated <= 3) {
        trendingScore += 2;
      }

      return {
        ...event,
        trendingScore,
        recentTicketSales,
      };
    });

    // Sort by trending score
    trendingEvents.sort((a, b) => b.trendingScore - a.trendingScore);

    return trendingEvents.slice(0, limit);
  },
});

// Popular Events (by total attendance)
export const getPopularEvents = query({
  args: {
    limit: v.optional(v.number()),
    categoryId: v.optional(v.id("eventCategories")),
    timeframe: v.optional(v.union(
      v.literal("all_time"),
      v.literal("this_year"),
      v.literal("this_month")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const timeframe = args.timeframe || "all_time";
    
    let events = await ctx.db.query("events").collect();

    // Filter by category if specified
    if (args.categoryId) {
      events = events.filter(event => event.categoryId === args.categoryId);
    }

    // Filter by timeframe
    if (timeframe !== "all_time") {
      const now = Date.now();
      const currentYear = new Date(now).getFullYear();
      const currentMonth = new Date(now).getMonth();
      
      events = events.filter(event => {
        const eventDate = new Date(event.eventDate);
        
        if (timeframe === "this_year") {
          return eventDate.getFullYear() === currentYear;
        } else if (timeframe === "this_month") {
          return eventDate.getFullYear() === currentYear && 
                 eventDate.getMonth() === currentMonth;
        }
        
        return true;
      });
    }

    // Sort by attendance count
    events.sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0));

    return events.slice(0, limit);
  },
});

// Search Suggestions/Autocomplete
export const getSearchSuggestions = query({
  args: {
    query: v.string(),
    type: v.optional(v.union(
      v.literal("events"),
      v.literal("locations"),
      v.literal("categories"),
      v.literal("tags")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const searchTerm = args.query.toLowerCase();
    const suggestions: Array<{ text: string; type: string; count?: number }> = [];

    if (!args.type || args.type === "events") {
      // Event name suggestions
      const events = await ctx.db.query("events").collect();
      const eventSuggestions = events
        .filter(event => event.name.toLowerCase().includes(searchTerm))
        .slice(0, limit)
        .map(event => ({
          text: event.name,
          type: "event",
        }));
      suggestions.push(...eventSuggestions);
    }

    if (!args.type || args.type === "locations") {
      // Location suggestions
      const events = await ctx.db.query("events").collect();
      const locations = new Map<string, number>();
      
      events.forEach(event => {
        const location = event.location.toLowerCase();
        if (location.includes(searchTerm)) {
          const count = locations.get(event.location) || 0;
          locations.set(event.location, count + 1);
        }
      });

      const locationSuggestions = Array.from(locations.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([location, count]) => ({
          text: location,
          type: "location",
          count,
        }));
      suggestions.push(...locationSuggestions);
    }

    if (!args.type || args.type === "categories") {
      // Category suggestions
      const categories = await ctx.db.query("eventCategories").collect();
      const categorySuggestions = categories
        .filter(category => 
          category.isActive && 
          category.name.toLowerCase().includes(searchTerm)
        )
        .slice(0, limit)
        .map(category => ({
          text: category.name,
          type: "category",
        }));
      suggestions.push(...categorySuggestions);
    }

    if (!args.type || args.type === "tags") {
      // Tag suggestions
      const events = await ctx.db.query("events").collect();
      const tags = new Map<string, number>();
      
      events.forEach(event => {
        if (event.tags) {
          event.tags.forEach(tag => {
            if (tag.includes(searchTerm)) {
              const count = tags.get(tag) || 0;
              tags.set(tag, count + 1);
            }
          });
        }
      });

      const tagSuggestions = Array.from(tags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({
          text: tag,
          type: "tag",
          count,
        }));
      suggestions.push(...tagSuggestions);
    }

    return suggestions.slice(0, limit);
  },
});

// Event Discovery Analytics
export const getDiscoveryAnalytics = query({
  args: {
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db.query("events").collect();
    const categories = await ctx.db.query("eventCategories").collect();

    // Filter by date range if provided
    let filteredEvents = events;
    if (args.dateRange) {
      filteredEvents = events.filter(event => 
        (event.createdAt || 0) >= args.dateRange!.start && 
        (event.createdAt || 0) <= args.dateRange!.end
      );
    }

    // Category distribution
    const categoryStats = new Map<string, { name: string; count: number; totalAttendees: number }>();
    
    filteredEvents.forEach(event => {
      if (event.categoryId) {
        const category = categories.find(c => c._id === event.categoryId);
        const categoryName = category?.name || "Unknown";
        
        const stats = categoryStats.get(event.categoryId) || {
          name: categoryName,
          count: 0,
          totalAttendees: 0,
        };
        
        stats.count += 1;
        stats.totalAttendees += event.attendeeCount || 0;
        categoryStats.set(event.categoryId, stats);
      }
    });

    // Popular tags
    const tagStats = new Map<string, number>();
    filteredEvents.forEach(event => {
      if (event.tags) {
        event.tags.forEach(tag => {
          const count = tagStats.get(tag) || 0;
          tagStats.set(tag, count + 1);
        });
      }
    });

    const topTags = Array.from(tagStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Location distribution
    const locationStats = new Map<string, number>();
    filteredEvents.forEach(event => {
      const city = event.location.split(',')[0].trim();
      const count = locationStats.get(city) || 0;
      locationStats.set(city, count + 1);
    });

    const topLocations = Array.from(locationStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));

    return {
      totalEvents: filteredEvents.length,
      categoryDistribution: Array.from(categoryStats.values()),
      topTags,
      topLocations,
      averageAttendance: filteredEvents.length > 0 ? 
        filteredEvents.reduce((sum, event) => sum + (event.attendeeCount || 0), 0) / filteredEvents.length : 0,
    };
  },
}); 