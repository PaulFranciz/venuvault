"use client";

import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-8 py-12 px-6 bg-white shadow-xl rounded-lg">
      <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
        Welcome to EventPulse!
      </h2>
      <p className="text-lg text-slate-600 max-w-md mx-auto">
        We're excited to help you create and manage your events. Let's get your
        organizer profile set up in a few quick steps.
      </p>
      <div>
        <Button
          onClick={onNext}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3"
        >
          Let's Get Started
        </Button>
      </div>
    </div>
  );
} 