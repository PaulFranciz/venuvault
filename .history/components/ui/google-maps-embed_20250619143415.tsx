'use client';

import React from 'react';
import { generateMapEmbedUrl } from '@/lib/googleMaps';
import { MapPin, ExternalLink } from 'lucide-react';

interface GoogleMapsEmbedProps {
  address: string;
  className?: string;
  height?: number;
  showOpenButton?: boolean;
}

export default function GoogleMapsEmbed({ 
  address, 
  className = "",
  height = 300,
  showOpenButton = true 
}: GoogleMapsEmbedProps) {
  if (!address.trim()) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-center text-gray-500">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Enter an address to see the map</p>
        </div>
      </div>
    );
  }

  const embedUrl = generateMapEmbedUrl(address);
  const openInGoogleMaps = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map of ${address}`}
        className="rounded-lg"
      />
      
      {showOpenButton && (
        <button
          onClick={openInGoogleMaps}
          className="absolute top-3 right-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-2 shadow-sm transition-colors group"
          title="Open in Google Maps"
        >
          <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
        </button>
      )}
      
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
        <p className="text-xs text-gray-700 truncate max-w-[200px]" title={address}>
          {address}
        </p>
      </div>
    </div>
  );
} 