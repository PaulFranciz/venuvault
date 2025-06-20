import { NextRequest, NextResponse } from 'next/server';
import { redisKeys, REDIS_TTL } from '@/lib/redis';
import { withCache } from '@/lib/cache';
import { ConvexHttpClient } from "convex/browser";
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const query = searchParams.get('query');
  const eventId = searchParams.get('eventId');

  try {
    switch (type) {
      case 'featured':
        return NextResponse.json(await getFeaturedEvents());
      case 'categories':
        return NextResponse.json(await getEventCategories());
      case 'popular':
        return NextResponse.json(await getPopularEvents());
      case 'trending':
        return NextResponse.json(await getTrendingEvents());
      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query parameter required for search' }, { status: 400 });
        }
        return NextResponse.json(await getSearchResults(query));
      case 'event':
        if (!eventId) {
          return NextResponse.json({ error: 'EventId parameter required for event details' }, { status: 400 });
        }
        return NextResponse.json(await getEventDetails(eventId));
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions moved from server actions
async function getFeaturedEvents() {
  return await withCache(
    'events:featured:list',
    async () => {
      try {
        const events = await convex.query(api.events.get);
        return events || [];
      } catch (error) {
        console.error('Failed to fetch events from Convex:', error);
        return [];
      }
    },
    { ttl: REDIS_TTL.EVENT_DETAILS }
  );
}

async function getEventCategories() {
  return await withCache(
    'categories:list',
    async () => {
      try {
        // For now, return static categories as getCategories function may not exist
        return [
          { id: 'music', name: 'Music' },
          { id: 'sports', name: 'Sports' },
          { id: 'arts', name: 'Arts & Theater' },
          { id: 'workshops', name: 'Workshops' },
          { id: 'conferences', name: 'Conferences' }
        ];
      } catch (error) {
        console.error('Failed to fetch categories from Convex:', error);
        return [
          { id: 'music', name: 'Music' },
          { id: 'sports', name: 'Sports' },
          { id: 'arts', name: 'Arts & Theater' },
          { id: 'workshops', name: 'Workshops' },
          { id: 'conferences', name: 'Conferences' }
        ];
      }
    },
    { ttl: REDIS_TTL.EVENT_DETAILS }
  );
}

async function getPopularEvents() {
  return await withCache(
    'popular:events',
    async () => {
      try {
        const events = await convex.query(api.events.get);
        return events || [];
      } catch (error) {
        console.error('Failed to fetch popular events from Convex:', error);
        return [];
      }
    },
    { ttl: REDIS_TTL.EVENT_DETAILS }
  );
}

async function getTrendingEvents() {
  return await withCache(
    'trending:events',
    async () => {
      try {
        const events = await convex.query(api.events.get);
        return events || [];
      } catch (error) {
        console.error('Failed to fetch trending events from Convex:', error);
        return [];
      }
    },
    { ttl: REDIS_TTL.EVENT_DETAILS }
  );
}

async function getSearchResults(query: string) {
  return await withCache(
    `search:${query.toLowerCase().trim()}`,
    async () => {
      try {
        const results = await convex.query(api.eventDiscovery.searchEvents, { query });
        return results?.events || [];
      } catch (error) {
        console.error('Failed to fetch search results from Convex:', error);
        return [];
      }
    },
    { ttl: REDIS_TTL.EVENT_DETAILS }
  );
}

async function getEventDetails(eventId: string) {
  return await withCache(
    redisKeys.eventDetails(eventId),
    async () => {
      try {
        const event = await convex.query(api.events.getById, { eventId: eventId as Id<"events"> });
        return event || null;
      } catch (error) {
        console.error('Failed to fetch event details from Convex:', error);
        return null;
      }
    },
    { ttl: REDIS_TTL.EVENT_DETAILS }
  );
} 