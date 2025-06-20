"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Instagram, Facebook, Linkedin, Send, Mail, MapPin, Phone } from "lucide-react";
import { usePathname } from "next/navigation";

// X (formerly Twitter) logo component
const XLogo = ({ className = "", size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

// TikTok logo component
const TikTokLogo = ({ className = "", size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
  </svg>
);

const Footer = () => {
  const pathname = usePathname();
  
  // Skip footer on certain pages like checkout
  if (pathname?.includes("/checkout") || pathname?.includes("/payment")) {
    return null;
  }
  
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full bg-[#141414] text-white relative">
      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none bg-[url('/images/noise.png')] bg-repeat"></div>
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <div className="mr-3">
                <Image 
                  src="/images/Ticwaka logo.svg" 
                  alt="Ticwaka Logo" 
                  width={120} 
                  height={32} 
                  className="mb-4"
                />
              </div>
            </div>
            <p className="text-gray-200 text-sm max-w-xs">
              Discover and book the best events in your city. Ticwaka connects you with
              amazing experiences tailored to your interests.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="https://x.com" className="hover:text-[#F96521] transition-colors" aria-label="X (formerly Twitter)">
                <XLogo size={20} />
              </a>
              <a href="https://tiktok.com" className="hover:text-[#F96521] transition-colors" aria-label="TikTok">
                <TikTokLogo size={20} />
              </a>
              <a href="https://facebook.com" className="hover:text-[#F96521] transition-colors" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="https://instagram.com" className="hover:text-[#F96521] transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://linkedin.com" className="hover:text-[#F96521] transition-colors" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-pally-medium mb-6">Quick Links</h3>
            <ul className="space-y-3 text-gray-200">
              <li><Link href="/discover" className="hover:text-[#F96521] transition-colors">Discover Events</Link></li>
              <li><Link href="/create-event" className="hover:text-[#F96521] transition-colors">Create Event</Link></li>
              <li><Link href="/seller" className="hover:text-[#F96521] transition-colors">Seller Dashboard</Link></li>
              <li><Link href="/about" className="hover:text-[#F96521] transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#F96521] transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Event Categories */}
          <div>
            <h3 className="text-lg font-pally-medium mb-6">Categories</h3>
            <ul className="space-y-3 text-gray-200">
              <li><Link href="/category/music" className="hover:text-[#F96521] transition-colors">Music</Link></li>
              <li><Link href="/category/sports" className="hover:text-[#F96521] transition-colors">Sports</Link></li>
              <li><Link href="/category/arts" className="hover:text-[#F96521] transition-colors">Arts & Theater</Link></li>
              <li><Link href="/category/workshops" className="hover:text-[#F96521] transition-colors">Workshops</Link></li>
              <li><Link href="/category/conferences" className="hover:text-[#F96521] transition-colors">Conferences</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-pally-medium mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin size={20} className="mr-3 text-[#F96521] flex-shrink-0 mt-1" />
                <p className="text-gray-200 text-sm">123 Event Street, Silicon Valley, CA 94025</p>
              </li>
              <li className="flex items-center">
                <Phone size={20} className="mr-3 text-[#F96521] flex-shrink-0" />
                <p className="text-gray-200 text-sm">+1 (123) 456-7890</p>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-3 text-[#F96521] flex-shrink-0" />
                <p className="text-gray-200 text-sm">support@ticwaka.com</p>
              </li>
            </ul>
            
            {/* Newsletter Signup */}
            <div className="mt-6">
              <h4 className="text-sm font-pally-medium mb-3">Subscribe to our newsletter</h4>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="px-3 py-2 text-gray-800 text-sm rounded-l-md w-full focus:outline-none"
                />
                <button className="bg-[#F96521] hover:bg-[#e55a1a] rounded-r-md px-3 transition-colors">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-300">
            © {currentYear} Ticwaka. All rights reserved.
          </p>
          <div className="flex mt-4 md:mt-0 space-x-6 text-sm text-gray-300">
            <Link href="/terms" className="hover:text-[#F96521] transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-[#F96521] transition-colors">Privacy Policy</Link>
            <Link href="/cookies" className="hover:text-[#F96521] transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
