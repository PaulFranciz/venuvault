'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OrganizerInfoForm from './OrganizerInfoForm';
import PaystackOnboardingForm from './PaystackOnboardingForm';
import { CheckCircle, Edit3, DollarSign } from 'lucide-react';

const STEPS = {
  PROFILE_INFO: 'PROFILE_INFO',
  PAYSTACK_SETUP: 'PAYSTACK_SETUP',
  // COMPLETED: 'COMPLETED' // Could be a final step if needed
};

interface OrganizerOnboardingStepperProps {
  onOnboardingComplete: () => void;
  // userId: string; // Pass if forms need it directly, though mutations should handle it
}

export default function OrganizerOnboardingStepper({
  onOnboardingComplete,
}: OrganizerOnboardingStepperProps) {
  const [currentStep, setCurrentStep] = useState(STEPS.PROFILE_INFO);

  const handleProfileInfoSuccess = (data: any) => {
    console.log('Profile info submitted:', data);
    // Here you would typically trigger a Convex mutation to save this data
    // and on successful mutation, proceed to the next step.
    setCurrentStep(STEPS.PAYSTACK_SETUP);
  };

  const handlePaystackSetupSuccess = () => {
    console.log('Paystack setup successful');
    // Here you would typically trigger a Convex mutation if needed for Paystack info
    // or update a flag indicating Paystack setup is complete.
    onOnboardingComplete(); // Notify parent that all steps are done
  };

  const stepsConfig = [
    {
      name: STEPS.PROFILE_INFO,
      title: 'Organizer Profile',
      icon: <Edit3 className="w-5 h-5" />,
    },
    {
      name: STEPS.PAYSTACK_SETUP,
      title: 'Payout Account',
      icon: <DollarSign className="w-5 h-5" />,
    },
  ];

  const currentStepIndex = stepsConfig.findIndex(step => step.name === currentStep);

  const formVariants = {
    hidden: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95
    }),
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20, duration: 0.5 }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 }
    })
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-50 p-4 sm:p-6 md:p-8 rounded-xl shadow-xl">
      {/* Stepper Navigation Visual */}
      <div className="mb-8 px-4">
        <ol className="flex items-center w-full">
          {stepsConfig.map((step, index) => (
            <li
              key={step.name}
              className={`flex w-full items-center ${index < stepsConfig.length - 1 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block" : ""} ${index <= currentStepIndex ? (index === currentStepIndex ? 'after:border-blue-600 text-blue-600' : 'after:border-green-500 text-green-500') : 'after:border-gray-300 text-gray-400'}`}
            >
              <motion.span 
                className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${index <= currentStepIndex ? (index === currentStepIndex ? 'bg-blue-600 text-white' : 'bg-green-500 text-white') : 'bg-gray-200 text-gray-500'}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {index < currentStepIndex ? <CheckCircle className="w-5 h-5" /> : step.icon}
              </motion.span>
              <div className="ml-3 hidden sm:block">
                  <h3 className={`font-medium ${index === currentStepIndex ? 'text-blue-700' : (index < currentStepIndex ? 'text-green-600' : 'text-gray-500')}`}>{step.title}</h3>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Form Content Area */}
      <div className="mt-8 relative overflow-hidden">
        <AnimatePresence initial={false} custom={currentStepIndex}> 
          {currentStep === STEPS.PROFILE_INFO && (
            <motion.div
              key={STEPS.PROFILE_INFO}
              custom={1} // Direction for animation
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <OrganizerInfoForm 
                onSuccess={handleProfileInfoSuccess} 
                // userId={userId} // Pass if needed
              />
            </motion.div>
          )}

          {currentStep === STEPS.PAYSTACK_SETUP && (
            <motion.div
              key={STEPS.PAYSTACK_SETUP}
              custom={1} // Direction for animation
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <PaystackOnboardingForm onSuccess={handlePaystackSetupSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 