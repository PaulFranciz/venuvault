"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function BlogPage() {
  // Sample blog posts
  const blogPosts = [
    {
      id: 1,
      title: "How to Create a Successful Virtual Event",
      excerpt: "Learn the essential steps to planning and hosting virtual events that engage and delight your audience.",
      date: "May 25, 2025",
      readTime: "5 min read",
      category: "Virtual Events",
    },
    {
      id: 2,
      title: "Pricing Strategies for Your Next Event",
      excerpt: "Discover effective ticket pricing strategies that maximize attendance while ensuring profitability.",
      date: "May 20, 2025",
      readTime: "7 min read",
      category: "Event Planning",
    },
    {
      id: 3,
      title: "Event Marketing: Tips and Tricks",
      excerpt: "Learn how to promote your events effectively through social media, email campaigns, and influencer partnerships.",
      date: "May 15, 2025",
      readTime: "6 min read",
      category: "Marketing",
    },
    {
      id: 4,
      title: "The Future of Event Technology",
      excerpt: "Explore upcoming trends in event technology and how they'll shape the industry in the coming years.",
      date: "May 10, 2025",
      readTime: "8 min read",
      category: "Technology",
    },
    {
      id: 5,
      title: "Creating Inclusive Events for All Attendees",
      excerpt: "Best practices for ensuring your events are accessible and welcoming to attendees of all backgrounds and abilities.",
      date: "May 5, 2025",
      readTime: "6 min read",
      category: "Inclusion",
    },
    {
      id: 6,
      title: "Post-Event Analysis: Measuring Success",
      excerpt: "Learn how to evaluate your event's performance using key metrics and analytics tools.",
      date: "April 30, 2025",
      readTime: "7 min read",
      category: "Analytics",
    },
  ];

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
        
        <div className="mb-12">
          <h1 className="text-4xl font-pally-bold text-gray-900 mb-4">EventPulse Blog</h1>
          <p className="text-xl text-gray-600">
            Insights, tips, and trends for event creators and attendees
          </p>
        </div>
        
        {/* Featured Post */}
        <div className="mb-16 bg-orange-50 rounded-xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 flex flex-col justify-center">
              <span className="text-[#F96521] font-pally-medium mb-2">Featured</span>
              <h2 className="text-3xl font-pally-bold text-gray-900 mb-4">
                The Complete Guide to Hybrid Events in 2025
              </h2>
              <p className="text-gray-600 mb-6">
                Hybrid events are here to stay. Learn how to blend in-person and virtual experiences 
                to create engaging events that reach a wider audience.
              </p>
              <div className="flex items-center text-sm text-gray-500 mb-6">
                <span className="mr-4">May 28, 2025</span>
                <span>10 min read</span>
              </div>
              <button className="bg-[#F96521] text-white px-6 py-2 rounded-lg hover:bg-[#F96521]/90 transition-colors self-start font-pally-medium">
                Read Article
              </button>
            </div>
            <div className="bg-gray-200 min-h-[300px] flex items-center justify-center">
              <span className="text-gray-500">Featured Image</span>
            </div>
          </div>
        </div>
        
        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <div key={post.id} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-gray-100 h-48 flex items-center justify-center">
                <span className="text-gray-400">Post Image</span>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#F96521] text-sm font-pally-medium">{post.category}</span>
                  <span className="text-gray-500 text-sm">{post.date}</span>
                </div>
                <h3 className="text-xl font-pally-bold text-gray-900 mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">{post.readTime}</span>
                  <button className="text-[#F96521] hover:text-[#F96521]/80 transition-colors font-pally-medium">
                    Read More
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Newsletter Signup */}
        <div className="mt-16 bg-gray-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-pally-bold text-gray-900 mb-4">Stay Updated</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Subscribe to our newsletter to receive the latest event industry insights, tips, and trends directly in your inbox.
          </p>
          <div className="flex max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Your email address" 
              className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#F96521]/70"
            />
            <button className="bg-[#F96521] text-white px-6 py-2 rounded-r-lg hover:bg-[#F96521]/90 transition-colors font-pally-medium">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
