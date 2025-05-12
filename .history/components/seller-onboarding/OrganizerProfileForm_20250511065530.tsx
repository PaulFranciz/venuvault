"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Spinner from "@/components/Spinner";

// This interface should align with the args of api.users.updateUserProfile
export interface OrganizerProfileSubmitData {
  name?: string; // Corresponds to 'organizerName' in the form, maps to 'name' in mutation
  bio?: string; // This will be stored as part of the user profile, perhaps in a 'bio' field if added to schema, or concatenated with description. For now, we align with updateUserProfile.
  logoStorageId?: Id<"_storage">;
  bannerStorageId?: Id<"_storage">;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
  };
  onboardingComplete?: boolean; // We'll set this to true after this step.
}

interface OrganizerProfileFormProps {
  // onSubmit will now directly use the data structure expected by updateUserProfile
  onSubmit: (data: OrganizerProfileSubmitData) => Promise<void>;
  onBack?: () => void;
  initialData?: Partial<OrganizerProfileSubmitData & { organizerName?: string }>; // To prefill form if data exists
}

export default function OrganizerProfileForm({ onSubmit, onBack, initialData }: OrganizerProfileFormProps) {
  // Use initialData to set default states
  const [organizerName, setOrganizerName] = useState(initialData?.name || initialData?.organizerName || "");
  const [bio, setBio] = useState(initialData?.bio || ""); // Assuming bio is part of initialData or a new field
  const [instagramHandle, setInstagramHandle] = useState(initialData?.socialLinks?.instagram || "");
  const [twitterHandle, setTwitterHandle] = useState(initialData?.socialLinks?.twitter || "");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  // Previews can also be set if initialData contains logo/banner storage IDs and we have a way to get their URLs
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // TODO: Prefill if initialData.logoStorageId
  const [bannerPreview, setBannerPreview] = useState<string | null>(null); // TODO: Prefill if initialData.bannerStorageId

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

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    if (!file) throw new Error("No file provided for upload.");
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const responseJson = await result.json();
    if (!responseJson.storageId) {
        console.error("Upload failed, response:", responseJson);
        throw new Error(`Upload failed for ${file.name}, storageId not received.`);
    }
    return responseJson.storageId as Id<"_storage">;
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
      let logoStorageId: Id<"_storage"> | undefined = initialData?.logoStorageId;
      let bannerStorageId: Id<"_storage"> | undefined = initialData?.bannerStorageId;

      if (logoFile) {
        logoStorageId = await uploadFile(logoFile);
      }
      if (bannerFile) {
        bannerStorageId = await uploadFile(bannerFile);
      }
      
      const profileDataToSubmit: OrganizerProfileSubmitData = {
        name: organizerName.trim(),
        // bio: bio.trim() || undefined, // updateUserProfile doesn't have bio, decide if we add it to schema or manage differently
        logoStorageId,
        bannerStorageId,
        socialLinks: {
          instagram: instagramHandle.trim() || undefined,
          twitter: twitterHandle.trim() || undefined,
        },
        // onboardingComplete will be handled by the parent component logic,
        // typically set to true after this step and payment step are done.
      };

      await onSubmit(profileDataToSubmit);
    } catch (err) {
      console.error("Profile submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: useEffect to prefill previews if initialData provides storage IDs and a getUrl query exists
  // For example:
  // const getFileUrl = useQuery(api.files.getFileUrl); // Assuming you add getFileUrl to convex/files.ts
  // useEffect(() => {
  //   if (initialData?.logoStorageId) {
  //     const url = getFileUrl({storageId: initialData.logoStorageId});
  //     if(url) setLogoPreview(url);
  //   }
  //   // Similarly for banner
  // }, [initialData, getFileUrl]);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-8 shadow-xl rounded-lg max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Your Organizer Profile
        </h2>
        <p className="text-slate-600 mt-2">
          This information helps attendees learn more about you.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="organizerName" className="text-slate-700 font-medium">
          Organizer / Business Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="organizerName"
          value={organizerName}
          onChange={(e) => setOrganizerName(e.target.value)}
          placeholder="e.g., Awesome Event Co."
          required
          disabled={isLoading}
          className="focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Bio field is currently not in updateUserProfile, can be added or stored elsewhere */}
      {/* <div className="space-y-2">
        <Label htmlFor="bio" className="text-slate-700 font-medium">
          Short Bio/Description (Optional)
        </Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us a bit about your organization or the events you host."
          rows={3}
          disabled={isLoading}
          className="focus:ring-blue-500 focus:border-blue-500"
        />
      </div> */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label htmlFor="logo" className="text-slate-700 font-medium">
            Logo (Optional)
          </Label>
          {logoPreview && (
            <div className="mt-2 mb-2 w-32 h-32 border rounded-md overflow-hidden bg-slate-50">
              <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
            </div>
          )}
          <Input
            id="logo"
            type="file"
            accept="image/*,.svg"
            onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
            disabled={isLoading}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="text-xs text-slate-500">Recommended: Square (e.g., JPG, PNG, SVG). Max 5MB.</p>
        </div>

        {/* Banner Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="banner" className="text-slate-700 font-medium">
            Cover Image (Optional)
          </Label>
          {bannerPreview && (
            <div className="mt-2 mb-2 aspect-video border rounded-md overflow-hidden bg-slate-50">
              <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <Input
            id="banner"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setBannerFile, setBannerPreview)}
            disabled={isLoading}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="text-xs text-slate-500">Recommended: Landscape, 16:9 ratio. Max 10MB.</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-700 pt-6 border-t border-slate-200 mt-6">
        Social Media (Optional)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-2">
          <Label htmlFor="instagramHandle" className="text-slate-700 font-medium">
            Instagram Handle
          </Label>
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">@</span>
            <Input
              id="instagramHandle"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))}
              placeholder="yourhandle"
              disabled={isLoading}
              className="focus:ring-blue-500 focus:border-blue-500 rounded-l-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="twitterHandle" className="text-slate-700 font-medium">
            X / Twitter Handle
          </Label>
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">@</span>
            <Input
              id="twitterHandle"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="YourHandle"
              disabled={isLoading}
              className="focus:ring-blue-500 focus:border-blue-500 rounded-l-none"
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-slate-200 mt-8 gap-4">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="w-full sm:w-auto">
            Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading || !organizerName.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 flex items-center justify-center gap-2 min-w-[180px] w-full sm:w-auto sm:ml-auto"
        >
          {isLoading ? <><Spinner size="sm" /> Saving...</> : "Save Profile & Continue"}
        </Button>
      </div>
    </form>
  );
} 