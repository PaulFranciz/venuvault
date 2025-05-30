"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FeaturesPage() {
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
        
        <h1 className="text-4xl font-pally-bold text-gray-900 mb-6">Features</h1>
        
        <div className="space-y-16">
          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Easy Event Creation</h2>
              <p className="text-gray-600 mb-4">
                Create beautiful event pages in minutes with our intuitive event builder. 
                Customize every aspect of your event from pricing to capacity limits.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Simple step-by-step creation process</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Custom ticket types with flexible pricing</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Powerful image upload and customization</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Feature Image</span>
            </div>
          </div>
          
          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1 bg-gray-100 h-64 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Feature Image</span>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Seamless Ticket Management</h2>
              <p className="text-gray-600 mb-4">
                Manage your event's ticket sales, attendees, and check-ins all in one place.
                Get real-time analytics on your sales and audience demographics.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Real-time ticket sales dashboard</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>QR code scanning for easy check-ins</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Attendee management and communication</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Virtual Event Support</h2>
              <p className="text-gray-600 mb-4">
                Host engaging virtual events with our integrated video conferencing tools.
                Secure access ensures only ticket holders can join your online events.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Secure virtual event links for ticket holders only</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Integration with popular video platforms</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#F96521] mr-2">✓</span>
                  <span>Automated access management</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Feature Image</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
