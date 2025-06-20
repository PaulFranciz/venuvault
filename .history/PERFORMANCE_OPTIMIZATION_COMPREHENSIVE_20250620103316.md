# Comprehensive Performance Optimization Plan

## Current Issues (From Terminal Logs)

### 1. Redis Performance Problems

- **Cache timeouts**: 2-second timeout too aggressive for slow networks
- **Connection failures**: Pool connections timing out
- **Redis policy warning**: `optimistic-volatile` should be `noeviction`
- **Response times**: 8-10 seconds for basic operations

### 2. Network Performance Issues

- **Slow API responses**: 3-10 seconds
- **Image loading failures**: 500 errors on Next.js image optimization
- **First page load**: 7.8 seconds

### 3. Database Query Performance

- **Convex queries**: Taking 6+ seconds
- **User ticket queries**: 8.9 seconds
- **Event data fetching**: 10+ seconds

## Immediate Fixes Applied

### Redis Configuration Improvements

```typescript
// ✅ FIXED: Increased cache timeouts
- Cache timeout: 2s → 10s (better for slow networks)
- Set timeout: 1s → 3s (more reliable writes)
- Stale timeout: 500ms → 1s (better fallback)
```

## Comprehensive Solution: Multi-Layer Caching with Varnish

### Architecture Overview

```
Internet → Varnish Cache → Next.js App → Redis Cache → Convex Database
```

### Layer 1: Varnish Reverse Proxy Cache

#### Benefits of Varnish

- **Static content acceleration**: CSS, JS, images, fonts
- **API response caching**: Event lists, user data (with TTL)
- **Geographic edge caching**: Faster delivery worldwide
- **Bandwidth reduction**: 60-90% reduction in origin requests
- **DDoS protection**: Handle traffic spikes

#### Varnish Configuration

Create `varnish/default.vcl`:

```vcl
vcl 4.1;

backend default {
    .host = "localhost";
    .port = "3001";  # Your Next.js port
    .connect_timeout = 60s;
    .first_byte_timeout = 60s;
    .between_bytes_timeout = 60s;
}

sub vcl_recv {
    # Remove cookies for static content
    if (req.url ~ "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)$") {
        unset req.http.Cookie;
        return (hash);
    }

    # Cache API responses with short TTL
    if (req.url ~ "^/api/(events|discover|search)") {
        # Remove user-specific headers for public APIs
        unset req.http.Cookie;
        unset req.http.Authorization;
        return (hash);
    }

    # Don't cache authenticated requests
    if (req.http.Cookie ~ "(auth|session)") {
        return (pass);
    }

    # Don't cache POST, PUT, DELETE
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }
}

sub vcl_backend_response {
    # Cache static assets for 1 week
    if (bereq.url ~ "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)$") {
        set beresp.ttl = 7d;
        set beresp.http.Cache-Control = "public, max-age=604800";
    }

    # Cache public API responses for 30 seconds
    if (bereq.url ~ "^/api/(events|discover|search)") {
        set beresp.ttl = 30s;
        set beresp.http.Cache-Control = "public, max-age=30";
    }

    # Cache HTML pages for 60 seconds
    if (beresp.http.Content-Type ~ "text/html") {
        set beresp.ttl = 60s;
        set beresp.http.Cache-Control = "public, max-age=60";
    }
}

sub vcl_deliver {
    # Add cache headers for debugging
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }
}
```

#### Docker Setup for Varnish

Create `docker-compose.yml`:

```yaml
version: "3.8"
services:
  varnish:
    image: varnish:7
    ports:
      - "80:80"
      - "6081:6081" # Varnish admin
    volumes:
      - ./varnish/default.vcl:/etc/varnish/default.vcl:ro
    environment:
      - VARNISH_SIZE=256m
    depends_on:
      - nextjs
    command: >
      varnishd -F 
      -f /etc/varnish/default.vcl 
      -s malloc,256m 
      -a :80
      -T :6081

  nextjs:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    volumes:
      - .:/app
      - /app/node_modules
```

### Layer 2: Next.js Optimizations

#### Image Optimization Fix

```javascript
// next.config.mjs
export default {
  images: {
    domains: ["silent-mallard-468.convex.cloud"],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 86400, // 24 hours
    dangerouslyAllowSVG: true,
    unoptimized: false, // Enable optimization
  },
  // Enable compression
  compress: true,
  // Enable experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["@radix-ui", "lucide-react"],
  },
  // Static generation for faster loading
  output: "standalone",
};
```

#### Browser Caching Headers

```typescript
// middleware.ts - Add caching headers
import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const response = NextResponse.next();

  // Cache static assets
  if (
    request.url.match(
      /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)$/
    )
  ) {
    response.headers.set("Cache-Control", "public, max-age=604800, immutable");
  }

  // Cache API responses with shorter TTL
  if (
    request.url.includes("/api/events") ||
    request.url.includes("/api/discover")
  ) {
    response.headers.set("Cache-Control", "public, max-age=30, s-maxage=60");
  }

  return response;
}
```

### Layer 3: Redis Optimizations

#### Connection Pool Improvements

```typescript
// lib/redis.ts improvements
const REDIS_CONFIG = {
  maxRetriesPerRequest: 2, // Increased for reliability
  connectTimeout: 10000, // 10s for slow networks
  commandTimeout: 8000, // 8s command timeout
  retryStrategy: (times) => Math.min(times * 500, 3000),
  maxLoadingTimeout: 10000,
  enableAutoPipelining: true, // Batch commands
  enableOfflineQueue: false, // Don't queue when offline
};
```

#### Redis Server Configuration

```bash
# Add to your Redis configuration
maxmemory-policy noeviction
tcp-keepalive 60
timeout 300
maxmemory 512mb
save 900 1
save 300 10
save 60 10000
```

### Layer 4: Database Query Optimization

#### Convex Query Improvements

```typescript
// hooks/useEventQueries.ts - Add query bundling
export function useOptimizedEventData(eventId: string) {
  return useQueries({
    queries: [
      {
        queryKey: ["event", eventId],
        queryFn: () => convex.query(api.events.get, { id: eventId }),
        staleTime: 60000, // 1 minute
      },
      {
        queryKey: ["event-availability", eventId],
        queryFn: () =>
          convex.query(api.events.getAvailability, { id: eventId }),
        staleTime: 30000, // 30 seconds
      },
    ],
  });
}
```

## Performance Monitoring Setup

### 1. Varnish Statistics

```bash
# Install varnish monitoring
docker exec varnish varnishstat -1

# Key metrics to monitor:
# - Cache hit ratio (aim for >80%)
# - Backend requests (should be low)
# - Cache misses (identify patterns)
```

### 2. Application Performance Monitoring

```typescript
// lib/performance-monitor.ts
export class PerformanceMonitor {
  static trackPageLoad(page: string, startTime: number) {
    const loadTime = performance.now() - startTime;
    console.log(`[PERF] ${page} loaded in ${loadTime.toFixed(2)}ms`);

    // Send to analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_load_time", {
        page_title: page,
        value: Math.round(loadTime),
      });
    }
  }

  static trackAPICall(endpoint: string, duration: number, success: boolean) {
    console.log(
      `[API] ${endpoint}: ${duration}ms (${success ? "success" : "failed"})`
    );
  }
}
```

## Implementation Plan

### Phase 1: Immediate (1-2 days)

1. ✅ Fix Redis timeouts (COMPLETED)
2. ⏳ Fix Next.js image optimization
3. ⏳ Add browser caching headers
4. ⏳ Optimize Convex queries

### Phase 2: Varnish Setup (2-3 days)

1. ⏳ Create Varnish configuration
2. ⏳ Set up Docker compose
3. ⏳ Configure SSL termination
4. ⏳ Test cache performance

### Phase 3: Monitoring (1 day)

1. ⏳ Set up Varnish monitoring
2. ⏳ Add performance tracking
3. ⏳ Create performance dashboard

## Expected Performance Improvements

### Before Optimization

- First page load: 7.8 seconds
- API responses: 3-10 seconds
- Cache hit rate: ~30%

### After Full Implementation

- First page load: 1-2 seconds (75% improvement)
- API responses: 200-500ms (85% improvement)
- Cache hit rate: 80-90%
- Static content: Instant (from Varnish)
- Database load: Reduced by 70%

## Monitoring Commands

```bash
# Check Varnish performance
varnishstat -1

# Check cache efficiency
curl -I http://localhost/api/events | grep X-Cache

# Monitor Redis performance
redis-cli info stats

# Check Next.js performance
npm run build && npm run start
```

## Next Steps

1. Want me to implement the Next.js image optimization fix first?
2. Should we set up Varnish with Docker Compose?
3. Would you prefer to start with Redis server configuration?

The logs show you're already seeing the benefits of fixing the phantom tickets bug - users now properly go through the purchase flow. With these performance optimizations, especially Varnish caching, we can dramatically improve the user experience on slow networks.
