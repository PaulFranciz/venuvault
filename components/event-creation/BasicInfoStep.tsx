import React, { useState } from 'react';
import { EventFormData } from '@/app/create-event/page'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useEventForm } from '@/providers/EventFormProvider';
import { useMutation } from 'convex/react'; 
import { api } from '@/convex/_generated/api'; 
import { Id } from '@/convex/_generated/dataModel'; 

interface BasicInfoStepProps {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  onNext,
  onBack,
  isSubmitting,
}) => {
  const { formData, setFormData } = useEventForm();
  const [bannerPreview, setBannerPreview] = useState<string | null>(formData.bannerImagePreviewUrl || null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(formData.thumbnailImagePreviewUrl || null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false); 
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false); 

  const generateUploadUrl = useMutation(api.files.generateUploadUrl); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'thumbnail') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'banner') {
      setIsUploadingBanner(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
        setFormData({
          bannerImage: file, 
          bannerImagePreviewUrl: reader.result as string 
        });
      };
      reader.readAsDataURL(file);

      try {
        const uploadUrl = await generateUploadUrl();

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        const { storageId } = await result.json();
        
        setFormData({
          bannerImageStorageId: storageId as Id<"_storage">, 
        });
        console.log("Banner image uploaded successfully. Storage ID:", storageId);
      } catch (error) {
        console.error("Error uploading banner image:", error);
      } finally {
        setIsUploadingBanner(false);
      }
    } else if (type === 'thumbnail') {
      setIsUploadingThumbnail(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setThumbnailPreview(imageUrl);
        setFormData({
          thumbnailImage: file,
          thumbnailImagePreviewUrl: imageUrl
        });
      };
      reader.readAsDataURL(file);

      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        setFormData({
          thumbnailImageStorageId: storageId as Id<"_storage">,
        });
        console.log("Thumbnail image uploaded successfully. Storage ID:", storageId);
      } catch (error) {
        console.error("Error uploading thumbnail image:", error);
      } finally {
        setIsUploadingThumbnail(false);
      }
    }
  };

  const removeImage = (type: 'banner' | 'thumbnail') => {
    if (type === 'banner') {
      setBannerPreview(null);
      setFormData({
        bannerImage: undefined,
        bannerImagePreviewUrl: undefined,
        bannerImageStorageId: undefined 
      });
    } else {
      setThumbnailPreview(null);
      setFormData({
        thumbnailImage: undefined,
        thumbnailImagePreviewUrl: undefined,
        thumbnailImageStorageId: undefined // Clear storage ID for thumbnail
      });
    }
  };

  const isNextDisabled = !formData.name || !formData.description;

  return (
    <div className="text-white">
      <div className="space-y-6">
        <div>
          <Label className="block text-white mb-2">Banner Image</Label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#3B3B3B] border-dashed rounded-lg">
            {bannerPreview ? (
              <div className="relative w-full">
                <Image
                  src={bannerPreview}
                  alt="Banner preview"
                  width={500}
                  height={200}
                  className="mx-auto rounded-lg object-cover h-48 w-full"
                />
                <button
                  type="button"
                  onClick={() => removeImage('banner')}
                  className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full p-1"
                  disabled={isUploadingBanner} 
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-[#F96521] mb-2" />
                  {isUploadingBanner ? (
                    <p className="text-sm text-gray-300">Uploading banner...</p>
                  ) : (
                    <p className="text-sm text-gray-300">
                      <label htmlFor="banner-upload" className={`relative cursor-pointer text-[#F96521] hover:text-[#F96521]/80 ${isUploadingBanner ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <span>Upload a banner image</span>
                        <input
                          id="banner-upload"
                          name="banner-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'banner')}
                          disabled={isUploadingBanner}
                        />
                      </label>
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label className="block text-white mb-2">Thumbnail Image</Label>
            <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-[#3B3B3B] border-dashed rounded-lg h-full">
              {thumbnailPreview ? (
                <div className="relative w-full">
                  <Image
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    width={200}
                    height={200}
                    className="mx-auto rounded-lg object-cover h-40 w-40"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage('thumbnail')}
                    className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full p-1"
                    disabled={isUploadingThumbnail} // Disable if uploading
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-[#F96521] mb-2" />
                    {isUploadingThumbnail ? (
                      <p className="text-sm text-gray-300">Uploading thumbnail...</p>
                    ) : (
                      <p className="text-sm text-gray-300">
                        <label htmlFor="thumbnail-upload" className={`relative cursor-pointer text-[#F96521] hover:text-[#F96521]/80 ${isUploadingThumbnail ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <span>Upload a thumbnail</span>
                          <input
                            id="thumbnail-upload"
                            name="thumbnail-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'thumbnail')}
                            disabled={isUploadingThumbnail} // Disable if uploading
                          />
                        </label>
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="md:col-span-2 space-y-4">
            <div>
              <Label htmlFor="name" className="block text-white mb-2">Event Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter event name"
                className="bg-[#2C2C2C] border-[#3B3B3B] text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="block text-white mb-2">Event Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your event"
                className="bg-[#2C2C2C] border-[#3B3B3B] text-white min-h-[180px]"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white"
              disabled={isSubmitting || isUploadingBanner || isUploadingThumbnail}
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            onClick={onNext}
            className="bg-[#F96521] hover:bg-[#F96521]/90 text-white"
            disabled={isNextDisabled || isSubmitting || isUploadingBanner || isUploadingThumbnail}
          >
            {isSubmitting ? 'Saving...' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;
