"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/public/images/Ticwaka logo.svg";
import SearchBar from "./SearchBar";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

function Header() {
  const { role, isLoading, isCreator, error } = useUserRole();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  
  // Check if we're on the home page
  const isHomePage = pathname === "/";
  
  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Default to showing the 'Sell Tickets' button if we encounter any errors
  const showDashboard = isCreator && !error;
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Navigation links
  const navLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
  ];

  return (
    <div className={`sticky top-0 z-50 ${isHomePage ? 'bg-transparent' : 'bg-white border-b'} ${scrolled && !isHomePage ? 'shadow-sm' : ''} ${scrolled && isHomePage ? 'bg-black/70 backdrop-blur-sm' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="font-bold">
              <Image
                src={logo}
                alt="logo"
                width={100}
                height={100}
                className="w-24 lg:w-28"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`px-3 py-2 text-sm font-pally-bold transition-colors ${isHomePage ? 'text-white hover:text-[#F96521]' : 'text-gray-600 hover:text-[#F96521]'}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Search Bar - Smaller width */}
          <div className="hidden md:block w-64 lg:w-80">
            <SearchBar />
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <SignedIn>
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <div className="bg-gray-300 text-gray-500 px-3 py-1.5 text-sm rounded-lg flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                ) : showDashboard ? (
                  <Link href="/seller">
                    <button className="bg-[#F96521] text-white px-3 py-1.5 text-sm rounded-lg hover:bg-[#F96521]/90 transition">
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <Link href="/create-event">
                    <button className="bg-[#F96521] text-white px-3 py-1.5 text-sm rounded-lg hover:bg-[#F96521]/90 transition">
                      Sell Tickets
                    </button>
                  </Link>
                )}

                <Link href="/tickets">
                  <button className={`${isHomePage ? 'bg-white/20 text-white hover:bg-white/30 border-white/30' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'} px-3 py-1.5 text-sm rounded-lg transition border`}>
                    My Tickets
                  </button>
                </Link>
                <UserButton />
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button className={`${isHomePage ? 'bg-white/20 text-white hover:bg-white/30 border-white/30' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'} px-3 py-1.5 text-sm rounded-lg transition border`}>
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <SignedIn>
              <UserButton />
            </SignedIn>
            <button 
              onClick={toggleMobileMenu} 
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className={`md:hidden ${isHomePage ? 'bg-black/90' : 'bg-white'} border-t`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {/* Mobile Search */}
            <div className="px-3 py-2">
              <SearchBar />
            </div>
            
            {/* Mobile Navigation Links */}
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`block px-3 py-2 rounded-md text-base font-pally-bold ${isHomePage ? 'text-white hover:text-[#F96521] hover:bg-white/10' : 'text-gray-700 hover:text-[#F96521] hover:bg-orange-50'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            
            {/* Mobile Action Buttons */}
            <SignedIn>
              <div className="px-3 py-2 space-y-2">
                {isLoading ? (
                  <div className="w-full bg-gray-300 text-gray-500 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                ) : showDashboard ? (
                  <Link href="/seller" className="block w-full">
                    <button 
                      className="w-full bg-[#F96521] text-white px-3 py-2 text-sm rounded-lg hover:bg-[#F96521]/90 transition"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </button>
                  </Link>
                ) : (
                  <Link href="/create-event" className="block w-full">
                    <button 
                      className="w-full bg-[#F96521] text-white px-3 py-2 text-sm rounded-lg hover:bg-[#F96521]/90 transition"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sell Tickets
                    </button>
                  </Link>
                )}

                <Link href="/tickets" className="block w-full">
                  <button 
                    className="w-full bg-gray-100 text-gray-800 px-3 py-2 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Tickets
                  </button>
                </Link>
              </div>
            </SignedIn>
            
            <SignedOut>
              <div className="px-3 py-2">
                <SignInButton mode="modal">
                  <button className="w-full bg-gray-100 text-gray-800 px-3 py-2 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
