import React from 'react';
import { EventFormData } from '@/app/create-event/page';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Music, Film, Utensils, Briefcase, GraduationCap, Heart, Users, Ticket } from 'lucide-react';
import { useEventForm } from '@/providers/EventFormProvider';

interface CategoryStepProps {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

const categories = [
  { id: 'music', name: 'Music', icon: <Music className="h-6 w-6" /> },
  { id: 'film', name: 'Film & Media', icon: <Film className="h-6 w-6" /> },
  { id: 'food', name: 'Food & Drink', icon: <Utensils className="h-6 w-6" /> },
  { id: 'business', name: 'Business', icon: <Briefcase className="h-6 w-6" /> },
  { id: 'education', name: 'Education', icon: <GraduationCap className="h-6 w-6" /> },
  { id: 'charity', name: 'Charity & Causes', icon: <Heart className="h-6 w-6" /> },
  { id: 'community', name: 'Community & Culture', icon: <Users className="h-6 w-6" /> },
  { id: 'other', name: 'Other', icon: <Ticket className="h-6 w-6" /> },
];

const CategoryStep: React.FC<CategoryStepProps> = ({
  onNext,
  onBack,
  isSubmitting,
}) => {
  const { formData, setFormData } = useEventForm();
  const handleCategoryChange = (value: string) => {
    setFormData({ category: value });
  };

  const isNextDisabled = !formData.category;

  return (
    <div className="text-white">
      <div className="space-y-6">
        <div>
          <Label className="block text-white mb-4">Select Event Category</Label>
          <RadioGroup 
            value={formData.category} 
            onValueChange={handleCategoryChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {categories.map((category) => (
              <div key={category.id} className="relative">
                <RadioGroupItem
                  value={category.id}
                  id={category.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={category.id}
                  className="flex items-center gap-3 p-4 border border-[#3B3B3B] rounded-lg cursor-pointer transition-all 
                  hover:border-[#F96521] hover:bg-[#2C2C2C] 
                  peer-checked:border-[#F96521] peer-checked:bg-[#2C2C2C]"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3B3B3B] text-[#F96521]">
                    {category.icon}
                  </div>
                  <span className="text-white">{category.name}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-between pt-4">
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="bg-transparent border-[#F96521] text-[#F96521] hover:bg-[#F96521]/10"
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            onClick={onNext}
            className="bg-[#F96521] hover:bg-[#F96521]/90 text-white ml-auto"
            disabled={isNextDisabled || isSubmitting}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CategoryStep;
