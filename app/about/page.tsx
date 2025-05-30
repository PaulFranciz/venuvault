"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        <h1 className="text-4xl font-pally-bold text-gray-900 mb-6">About EventPulse</h1>
        
        <div className="prose prose-lg max-w-none">
          <div className="bg-gray-100 h-80 rounded-lg flex items-center justify-center mb-8">
            <span className="text-gray-400">Company Image</span>
          </div>
          
          <h2 className="font-pally-bold">Our Mission</h2>
          <p>
            At Ticwaka, we believe that events have the power to connect people, share knowledge, 
            and create memorable experiences. Our mission is to make event management accessible to everyone, 
            from individual creators to large organizations, by providing an intuitive platform that simplifies 
            the entire event lifecycle.
          </p>
          
          <h2 className="font-pally-bold">Our Story</h2>
          <p>
            Founded in 2023, Ticwaka was born from a simple observation: event creation and management 
            was unnecessarily complex. Our founders, a group of event enthusiasts and technology experts, 
            set out to build a platform that would make it easy for anyone to create, promote, and manage 
            events of any size.
          </p>
          
          <p>
            What started as a simple ticketing solution has grown into a comprehensive event management 
            platform that handles everything from event creation and promotion to ticket sales, check-ins, 
            and post-event analytics.
          </p>
          
          <h2 className="font-pally-bold">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6 my-8">
            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-lg font-pally-bold text-[#F96521] mb-2">Simplicity</h3>
              <p className="text-[#F96521]/80">
                We believe technology should simplify, not complicate. Every feature we build aims to 
                make event management easier.
              </p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-green-800 mb-2">Accessibility</h3>
              <p className="text-green-700">
                Events are for everyone. We're committed to building a platform that's accessible to 
                event creators and attendees of all backgrounds.
              </p>
            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-orange-800 mb-2">Innovation</h3>
              <p className="text-orange-700">
                The events industry is constantly evolving, and so are we. We're always looking for 
                new ways to improve the event experience.
              </p>
            </div>
          </div>
          
          <h2 className="font-pally-bold">Meet the Team</h2>
          <p>
            Our diverse team brings together expertise in technology, event management, design, and 
            customer support. We're united by our passion for events and our commitment to building 
            the best event management platform possible.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 my-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="text-center">
                <div className="bg-gray-200 h-32 w-32 rounded-full mx-auto mb-4"></div>
                <h3 className="font-bold">Team Member {item}</h3>
                <p className="text-gray-600 text-sm">Position</p>
              </div>
            ))}
          </div>
          
          <h2 className="font-pally-bold">Join Us</h2>
          <p>
            We're always looking for talented individuals to join our team. If you're passionate about 
            events and technology, check out our careers page or reach out to us directly.
          </p>
          
          <div className="bg-gray-50 p-6 rounded-lg mt-8">
            <h3 className="text-xl font-pally-bold text-gray-900 mb-4">Get in Touch</h3>
            <p className="mb-4">
              Have questions about EventPulse? We'd love to hear from you!
            </p>
            <Link href="/contact">
              <button className="bg-[#F96521] text-white px-6 py-2 rounded-lg hover:bg-[#F96521]/90 transition-colors font-pally-medium">
                Contact Us
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
