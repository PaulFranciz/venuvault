'use client';

import React from 'react';

interface OnboardingFormProps {
  userProfile: any; // Replace 'any' with a more specific type if available
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ userProfile }) => {
  // TODO: Implement the actual onboarding form UI and logic here
  // This is a placeholder component.
  console.log('OnboardingForm received userProfile:', userProfile);

  return (
    <div className="bg-white shadow-xl rounded-lg p-8 md:p-12">
      <h2 className="text-2xl font-semibold text-slate-800 mb-6">Complete Your Profile</h2>
      <p className="text-slate-600 mb-4">
        Please fill out the form below to complete your organizer profile.
      </p>
      {/* Placeholder for form fields */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Organizer Name</label>
          <input type="text" name="name" id="name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Your Company Name" />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea name="bio" id="bio" rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Tell us about your organization..."></textarea>
        </div>
        <button 
          type="submit" 
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-teal hover:bg-brand-teal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal-dark"
        >
          Save and Continue
        </button>
      </div>
      {userProfile && (
        <div className="mt-6 p-4 bg-slate-50 rounded-md">
          <h3 className="text-sm font-medium text-slate-700">Current Profile Data (for debugging):</h3>
          <pre className="text-xs text-slate-500 overflow-x-auto">{JSON.stringify(userProfile, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default OnboardingForm;