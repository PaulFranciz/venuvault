"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCachePreload } from "@/hooks/useCachePreload";

export default function HeroSection() {
  const router = useRouter();
  const pathname = usePathname();
  const { preloadEvents } = useCachePreload();
  
  // Preload discover page resources in the background
  useEffect(() => {
    // Preload the discover page route
    router.prefetch("/discover");
    
    // Preload event data for discover page
    preloadEvents();
    
    // Prefetch potential next images
    const prefetchImages = [
      "/images/discover-events-banner.webp",
      "/images/popular-event-1.webp",
      "/images/popular-event-2.webp"
    ];
    
    prefetchImages.forEach(src => {
      const img = new window.Image();
      img.src = src;
    });
  }, [router, preloadEvents]);
  return (
    <section className="relative w-full h-[100svh] md:h-[100vh] overflow-hidden -mt-16">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/discover hero image.webp"
          alt="Events background"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          quality={90}
          className="object-cover object-center brightness-[0.5]"
          onLoad={() => {
            // Track the Largest Contentful Paint for performance monitoring
            if (window.performance && window.performance.mark) {
              window.performance.mark('hero-image-loaded');
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />
      </div>
      
      {/* Hero Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-pally-bold text-white mb-4 md:mb-6">
          <span className="text-[#F96521]">Discover</span> and Experience<br />
          <span className="text-[#F96521]">Unforgettable</span> Events
        </h1>
        
        <p className="text-xl md:text-2xl text-white/90 mb-8 md:mb-10 max-w-3xl">
          Find and book tickets for the best events happening near you, from concerts and performances to workshops and conferences.
        </p>
        
        <Link 
          href="/discover"
          prefetch={true}
          onClick={(e) => {
            // We're only preventing default if we need to do something fancy
            // like transition effects or data preloading before navigation
            if (pathname === "/") {
              e.preventDefault();
              // Any pre-navigation effects can go here
              
              // Then programmatically navigate to ensure all resources are loaded
              setTimeout(() => router.push("/discover"), 10);
            }
          }}>
          <button className="bg-[#F96521] hover:bg-[#F96521]/90 text-white px-8 py-4 rounded-full text-lg font-pally-medium transition-all duration-300 flex items-center group">
            Discover Events
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </Link>
        
        <div className="absolute bottom-10 left-0 right-0 flex justify-center animate-bounce">
          <div className="w-10 h-10 border-2 border-white rounded-full flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-white rotate-90" />
          </div>
        </div>
      </div>
    </section>
  );
}
