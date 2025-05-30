"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        <div className="text-center mb-16">
          <h1 className="text-4xl font-pally-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that's right for your events. Fair pricing with no hidden fees.
          </p>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            We charge a standard fee of <span className="font-semibold">8.5% + ₦100</span> per paid ticket to maintain our platform. 
            For high-volume events, we offer discounted rates.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 transition-all hover:shadow-xl">
            <div className="p-8">
              <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Free</h2>
              <p className="text-gray-600 mb-6">Perfect for occasional events or just getting started.</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">₦0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <Link href="/sign-up">
                <button className="w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  Get Started
                </button>
              </Link>
            </div>
            <div className="bg-gray-50 px-8 py-6">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Up to 3 events per month</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Basic event customization</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Up to 100 attendees per event</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>8.5% + ₦100 per paid ticket</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Professional Plan */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#F96521]/20 relative transform scale-105 z-10">
            <div className="absolute top-0 inset-x-0 bg-[#F96521] text-white text-center py-1 text-sm font-pally-medium">
              Most Popular
            </div>
            <div className="p-8 pt-12">
              <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Professional</h2>
              <p className="text-gray-600 mb-6">For event creators ready to grow their audience.</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">₦9,999</span>
                <span className="text-gray-500">/month</span>
              </div>
              <Link href="/sign-up">
                <button className="w-full py-3 px-4 bg-[#F96521] rounded-lg text-white font-pally-medium hover:bg-[#F96521]/90 transition-colors">
                  Start Free Trial
                </button>
              </Link>
            </div>
            <div className="bg-orange-50 px-8 py-6">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#F96521] mr-2 flex-shrink-0 mt-0.5" />
                  <span>Unlimited events</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#F96521] mr-2 flex-shrink-0 mt-0.5" />
                  <span>Advanced event customization</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#F96521] mr-2 flex-shrink-0 mt-0.5" />
                  <span>Up to 500 attendees per event</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#F96521] mr-2 flex-shrink-0 mt-0.5" />
                  <span>7% + ₦100 per paid ticket</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#F96521] mr-2 flex-shrink-0 mt-0.5" />
                  <span>Free event tickets at no cost</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-[#F96521] mr-2 flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Enterprise Plan */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 transition-all hover:shadow-xl">
            <div className="p-8">
              <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Enterprise</h2>
              <p className="text-gray-600 mb-6">Custom solutions for large-scale event organizers.</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">Custom</span>
              </div>
              <Link href="/contact">
                <button className="w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  Contact Us
                </button>
              </Link>
            </div>
            <div className="bg-gray-50 px-8 py-6">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Unlimited everything</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Custom branding</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Volume discount: 6% + ₦100 for high-volume events</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>API access</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Questions?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our team is here to help you find the perfect plan for your needs.
            Reach out to us for any pricing questions.
          </p>
          <Link href="/contact">
            <button className="py-3 px-8 border border-[#F96521] rounded-lg text-[#F96521] font-pally-medium hover:bg-orange-50 transition-colors">
              Contact Sales
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
