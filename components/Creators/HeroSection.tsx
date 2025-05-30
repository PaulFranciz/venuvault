'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const HeroSection = () => {
  return (
    <section className="w-full bg-[#0C090C] text-white py-6 flex items-center overflow-hidden">
      <div className="max-w-[90rem] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="bg-[#141414] rounded-3xl p-4 md:p-8 lg:p-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 items-center">
        {/* Left Content */}
        <div className="flex flex-col space-y-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-pally font-pally-bold leading-tight">
            <span className="text-[#F96521]">Grow Your Event Business</span>
            <br /> <span className="text-[#F96521]">with Ticwaka</span>
          </h1>
          
          <p className="text-lg md:text-xl max-w-xl font-pally">
            Manage your events, sell tickets, and build your audience with our all-in-one 
            platform designed for African event creators. Get payouts directly
            to your bank account.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/create-event"
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 rounded-md",
                "bg-[#F96521] text-white font-pally font-pally-medium text-lg",
                "hover:bg-[#E85410] transition duration-200"
              )}
            >
              Create Event <ArrowRight className="h-5 w-5" />
            </Link>
            
            <Link 
              href="#learn-more"
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 rounded-md",
                "border border-[#F96521]/30 text-[#F96521] font-pally font-pally-medium text-lg",
                "hover:bg-[#F96521]/10 transition duration-200"
              )}
            >
              Learn More
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-pally font-pally-bold text-[#F96521]">500+</p>
              <p className="text-sm md:text-base font-pally">Events Hosted</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-pally font-pally-bold text-[#F96521]">50K+</p>
              <p className="text-sm md:text-base font-pally">Tickets Sold</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-pally font-pally-bold text-[#F96521]">99%</p>
              <p className="text-sm md:text-base font-pally">Satisfaction</p>
            </div>
          </div>
        </div>
        
        {/* Right Content - App Mockup */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative h-[500px] w-[350px] md:h-[550px] md:w-[450px] lg:h-[600px] lg:w-[550px] xl:h-[650px] xl:w-[600px]">
            <Image
              src="https://cdn.prod.website-files.com/63770a30d8567453a8262011/6564d58989d3df88d615b0a6_Tixr_Screen.webp" 
              alt="Ticwaka App Mockup"
              fill
              className="object-contain"
              priority
              fetchPriority="high"
              quality={100}
            />
            {/* Using the complete image from the URL */}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
