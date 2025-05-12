"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react"; // Example icon for placeholder

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="w-full max-w-4xl mx-auto font-pally bg-slate-50 min-h-[calc(100vh-160px)] flex items-center justify-center p-4 md:p-8"
    >
      <div className="bg-white shadow-xl rounded-xl p-6 md:p-10 lg:p-12 w-full">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text Content - Left Column */}
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-pally-bold text-slate-900">
              Welcome to EventPulse!
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-pally leading-relaxed">
              We're excited to help you create and manage your events. Let's get your 
              organizer profile set up in a few quick steps.
            </p>
            <div>
              <Button
                onClick={onNext}
                // size="lg" // Using custom padding now
                className="w-full sm:w-auto px-8 py-3 font-pally-medium text-base bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg focus:ring-4 focus:ring-blue-300 disabled:opacity-50"
              >
                Let's Get Started
              </Button>
            </div>
          </div>

          {/* Image Placeholder - Right Column (Desktop), Top (Mobile order can be adjusted) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="hidden md:flex aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl items-center justify-center p-8 shadow-inner"
          >
            {/* Placeholder Content: Replace with <Image /> or actual image */}
            <div className="text-center">
              <Rocket size={64} className="text-blue-500 mb-4 mx-auto" strokeWidth={1.5}/>
              <p className="font-pally-medium text-slate-700 text-lg">Your Awesome Events Start Here</p>
              <p className="font-pally text-slate-500 text-sm">Illustrative image will appear here</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
} 