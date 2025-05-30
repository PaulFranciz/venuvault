"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import { Label as UiLabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Spinner from "@/components/Spinner";
import { motion } from "framer-motion";
import { UploadCloud, Image as ImageIcon, Info, Trash2, RefreshCw } from "lucide-react";

// This interface should align with the args of api.users.updateUserProfile
export interface OrganizerProfileSubmitData {
  name?: string;
  bio?: string;
  logoStorageId?: Id<"_storage">;
  bannerStorageId?: Id<"_storage">;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
  };
  onboardingComplete?: boolean;
}

interface OrganizerProfileFormProps {
  onSubmit: (data: OrganizerProfileSubmitData) => Promise<void>;
  onBack?: () => void;
  initialData?: Partial<OrganizerProfileSubmitData>;
}

// Custom hook to safely get a storage URL
const useStorageUrl = (storageId: Id<"_storage"> | undefined) => {
  const args = storageId ? { storageId } : "skip";
  // The type of `url` will be `string | null | undefined`.
  // `string | null` from `getFileUrl` if executed, `undefined` if skipped.
  const url = useQuery(api.files.getFileUrl, args as any); // `as any` to handle "skip" string literal with generic Id type
  return url;
};

export default function OrganizerProfileForm({ onSubmit, onBack, initialData }: OrganizerProfileFormProps) {
  const [organizerName, setOrganizerName] = useState(initialData?.name || "");
  const [bio, setBio] = useState(initialData?.bio || "");
  const [instagramHandle, setInstagramHandle] = useState(initialData?.socialLinks?.instagram || "");
  const [twitterHandle, setTwitterHandle] = useState(initialData?.socialLinks?.twitter || "");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Fetch initial previews if storage IDs are present
  const initialLogoUrl = useStorageUrl(initialData?.logoStorageId);
  const initialBannerUrl = useStorageUrl(initialData?.bannerStorageId);

  useEffect(() => {
    if (initialLogoUrl && !logoFile) { // Only set if URL exists and no new file is staged
      setLogoPreview(initialLogoUrl);
    }
  }, [initialLogoUrl, logoFile]);

  useEffect(() => {
    if (initialBannerUrl && !bannerFile) { // Only set if URL exists and no new file is staged
      setBannerPreview(initialBannerUrl);
    }
  }, [initialBannerUrl, bannerFile]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFile(null);
      setPreview(null);
    }
  };
  
  // State to track if a file has been explicitly cleared by the user
  const [logoCleared, setLogoCleared] = useState(false);
  const [bannerCleared, setBannerCleared] = useState(false);

  const clearFile = (
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    fieldToClear: 'logoStorageId' | 'bannerStorageId'
  ) => {
    setFile(null);
    setPreview(null);
    if (fieldToClear === 'logoStorageId') {
      setLogoCleared(true);
    } else if (fieldToClear === 'bannerStorageId') {
      setBannerCleared(true);
    }
  };

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    if (!file) throw new Error("No file provided for upload.");
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    if (!storageId) {
        console.error("Upload failed, response:", await result.text());
        throw new Error(`Upload failed for ${file.name}.`);
    }
    return storageId as Id<"_storage">;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!organizerName.trim()) {
      setError("Organizer name is required.");
      setIsLoading(false);
      return;
    }

    try {
      let logoIdToSubmit: Id<"_storage"> | undefined | null = initialData?.logoStorageId;
      let bannerIdToSubmit: Id<"_storage"> | undefined | null = initialData?.bannerStorageId;

      if (logoFile) {
        logoIdToSubmit = await uploadFile(logoFile);
      } else if (logoCleared) {
        logoIdToSubmit = null;
      }

      if (bannerFile) {
        bannerIdToSubmit = await uploadFile(bannerFile);
      } else if (bannerCleared) {
        bannerIdToSubmit = null;
      }
      
      const profileDataToSubmit: OrganizerProfileSubmitData = {
        name: organizerName.trim(),
        bio: bio.trim() || undefined,
        logoStorageId: logoIdToSubmit === null ? undefined : logoIdToSubmit,
        bannerStorageId: bannerIdToSubmit === null ? undefined : bannerIdToSubmit,
        socialLinks: {
          instagram: instagramHandle.trim() || undefined,
          twitter: twitterHandle.trim() || undefined,
        },
      };

      await onSubmit(profileDataToSubmit);
    } catch (err) {
      console.error("Profile submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Custom File Uploader Component
  interface FileUploaderProps {
    id: string;
    label: string;
    currentPreview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileClear: () => void;
    accept: string;
    helpText: string;
    aspectRatio?: 'square' | 'video';
    disabled?: boolean;
  }

  const FileUploader: React.FC<FileUploaderProps> = ({
    id, label, currentPreview, onFileChange, onFileClear, accept, helpText, aspectRatio = 'square', disabled
  }) => {
    return (
      <div className="space-y-2">
        <UiLabel htmlFor={id} className="block text-sm font-pally-medium text-slate-700">
          {label}
        </UiLabel>
        <div 
          className={`
            mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md 
            hover:border-brand-teal transition-colors group
            ${aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'} 
            ${currentPreview ? 'bg-slate-50' : 'bg-white'}
            relative
          `}
        >
          {currentPreview ? (
            <>
              <div className="relative w-full h-full">
                <Image 
                  src={currentPreview} 
                  alt="Preview" 
                  layout="fill" 
                  objectFit="contain" 
                  className="rounded-md" 
                />
              </div>
              <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  type="button"
                  onClick={() => document.getElementById(id)?.click()}
                  className="p-1.5 bg-white/80 hover:bg-white rounded-full shadow-md text-slate-700 hover:text-brand-teal transition-all"
                  title="Change image"
                  disabled={disabled}
                >
                  <RefreshCw size={18} />
                </button>
                <button 
                  type="button"
                  onClick={onFileClear}
                  className="p-1.5 bg-white/80 hover:bg-white rounded-full shadow-md text-slate-700 hover:text-brand-teal transition-all"
                  title="Remove image"
                  disabled={disabled}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-1 text-center cursor-pointer" onClick={() => !disabled && document.getElementById(id)?.click()}>
              <UploadCloud className="mx-auto h-12 w-12 text-slate-400 group-hover:text-brand-teal transition-colors" />
              <p className="text-sm font-pally text-slate-500 group-hover:text-brand-teal transition-colors">
                Click to upload
              </p>
              <p className="text-xs font-pally text-slate-400">or drag and drop</p>
            </div>
          )}
          <UiInput
            id={id}
            type="file"
            accept={accept}
            onChange={onFileChange}
            disabled={disabled}
            className="sr-only"
          />
        </div>
        <p className="text-xs font-pally text-slate-500 flex items-center">
          <Info size={12} className="mr-1 text-slate-400 shrink-0" /> {helpText}
        </p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="w-full max-w-3xl mx-auto py-8 md:py-12 px-4 font-pally bg-slate-50 min-h-[calc(100vh-100px)]"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-10"
      >
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl sm:text-4xl font-pally-bold text-slate-900">
            Your Organizer Profile
          </h2>
          <p className="text-slate-600 mt-3 text-base sm:text-lg font-pally max-w-xl mx-auto">
            This information will be displayed on your event pages and helps attendees get to know you.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm" role="alert">
            <p className="font-pally-bold">Houston, we have a problem!</p>
            <p className="font-pally text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6 p-6 md:p-8 bg-white rounded-xl shadow-lg">
           <h3 className="text-xl font-pally-medium text-slate-800 border-b border-slate-200 pb-3 mb-6">
             Basic Details
           </h3>
          <div>
            <UiLabel htmlFor="organizerName" className="block text-sm font-pally-medium text-slate-700 mb-1.5">
              Organizer / Business Name <span className="text-red-500">*</span>
            </UiLabel>
            <UiInput
              id="organizerName"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              placeholder="e.g., Stellar Events Inc."
              required
              disabled={isLoading}
              className="w-full px-4 py-3 font-pally rounded-md border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        
        <div className="space-y-6 p-6 md:p-8 bg-white rounded-xl shadow-lg">
          <h3 className="text-xl font-pally-medium text-slate-800 border-b border-slate-200 pb-3 mb-6">
            Branding Assets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FileUploader 
              id="logo"
              label="Logo"
              currentPreview={logoPreview}
              onFileChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
              onFileClear={() => clearFile(setLogoFile, setLogoPreview, 'logoStorageId')}
              accept="image/*,.svg"
              helpText="Square (e.g., JPG, PNG, SVG). Max 5MB."
              aspectRatio="square"
              disabled={isLoading}
            />
            <FileUploader 
              id="banner"
              label="Cover Image"
              currentPreview={bannerPreview}
              onFileChange={(e) => handleFileChange(e, setBannerFile, setBannerPreview)}
              onFileClear={() => clearFile(setBannerFile, setBannerPreview, 'bannerStorageId')}
              accept="image/*"
              helpText="Landscape, 16:9 ratio. Max 10MB."
              aspectRatio="video"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-6 p-6 md:p-8 bg-white rounded-xl shadow-lg">
          <h3 className="text-xl font-pally-medium text-slate-800 border-b border-slate-200 pb-3 mb-6">
            Connect Your Socials <span className="text-sm font-pally text-slate-500">(Optional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            <div>
              <UiLabel htmlFor="instagramHandle" className="block text-sm font-pally-medium text-slate-700 mb-1.5">
                Instagram
              </UiLabel>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-100 text-slate-500 text-sm font-pally">@</span>
                <UiInput
                  id="instagramHandle"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))}
                  placeholder="yourhandle"
                  disabled={isLoading}
                  className="w-full px-4 py-3 font-pally rounded-r-md border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal disabled:bg-slate-50 disabled:cursor-not-allowed border-l-0"
                />
              </div>
            </div>
            <div>
              <UiLabel htmlFor="twitterHandle" className="block text-sm font-pally-medium text-slate-700 mb-1.5">
                X (Twitter)
              </UiLabel>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-100 text-slate-500 text-sm font-pally">@</span>
                <UiInput
                  id="twitterHandle"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="yourhandle"
                  disabled={isLoading}
                  className="w-full px-4 py-3 font-pally rounded-r-md border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal disabled:bg-slate-50 disabled:cursor-not-allowed border-l-0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 mt-8">
          {onBack && (
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="w-full sm:w-auto px-8 py-3 font-pally-medium text-base border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3 font-pally-medium text-base bg-brand-teal hover:bg-opacity-90 text-white rounded-lg transition-colors shadow-md hover:shadow-lg focus:ring-4 focus:ring-brand-teal focus:ring-opacity-50 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Spinner /> <span className="ml-2">Saving Profile...</span>
              </>
            ) : (
              "Save Profile & Continue"
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
} 