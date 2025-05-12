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

interface OrganizerProfileFormProps {
  onSubmit: (data: OrganizerProfileData) => Promise<void>;
  onBack?: () => void;
}

export interface OrganizerProfileData {
  organizerName: string;
  bio?: string;
  logoStorageId?: Id<"_storage">;
  bannerStorageId?: Id<"_storage">;
  instagramHandle?: string;
  twitterHandle?: string;
}

export default function OrganizerProfileForm({ onSubmit, onBack }: OrganizerProfileFormProps) {
  const [organizerName, setOrganizerName] = useState("");
  const [bio, setBio] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

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
    const { storageId } = await result.json();
    if (!storageId) {
        throw new Error("Upload failed, storageId not received.");
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
      let logoStorageId: Id<"_storage"> | undefined = undefined;
      let bannerStorageId: Id<"_storage"> | undefined = undefined;

      if (logoFile) {
        logoStorageId = await uploadFile(logoFile);
      }
      if (bannerFile) {
        bannerStorageId = await uploadFile(bannerFile);
      }

      await onSubmit({
        organizerName,
        bio,
        logoStorageId,
        bannerStorageId,
        instagramHandle,
        twitterHandle,
      });
    } catch (err) {
      console.error("Profile submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile. Ensure you have a `files.ts` convex function for `generateUploadUrl`.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-8 shadow-xl rounded-lg max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Set Up Your Organizer Profile
        </h2>
        <p className="text-slate-600 mt-2">
          Share some details about your organization. This information will be visible to attendees.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="organizerName" className="text-slate-700 font-medium">
          Organizer Name <span className="text-red-500">*</span>
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

      <div className="space-y-2">
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
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="logo" className="text-slate-700 font-medium">
            Logo (Optional)
          </Label>
          {logoPreview && (
            <div className="mt-2 mb-2 w-32 h-32 border rounded-md overflow-hidden mx-auto md:mx-0">
              <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
            </div>
          )}
          <Input
            id="logo"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
            disabled={isLoading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="text-xs text-slate-500">Recommended: Square image (e.g., JPG, PNG). Max 5MB.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner" className="text-slate-700 font-medium">
            Banner Image (Optional)
          </Label>
          {bannerPreview && (
            <div className="mt-2 mb-2 aspect-video border rounded-md overflow-hidden mx-auto md:mx-0">
              <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <Input
            id="banner"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setBannerFile, setBannerPreview)}
            disabled={isLoading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="text-xs text-slate-500">Recommended: Landscape, 16:9 ratio. Max 10MB.</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-700 pt-4 border-t border-slate-200 mt-6">
        Social Media (Optional)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="instagramHandle" className="text-slate-700 font-medium">
            Instagram Handle
          </Label>
          <Input
            id="instagramHandle"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="yourhandle (without @)"
            disabled={isLoading}
            className="focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="twitterHandle" className="text-slate-700 font-medium">
            X / Twitter Handle
          </Label>
          <Input
            id="twitterHandle"
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            placeholder="YourHandle (without @)"
            disabled={isLoading}
            className="focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-8">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
            Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading || !organizerName.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 flex items-center justify-center gap-2 min-w-[150px] ml-auto"
        >
          {isLoading ? <><Spinner size="sm" /> Saving...</> : "Save & Continue"}
        </Button>
      </div>
    </form>
  );
} 