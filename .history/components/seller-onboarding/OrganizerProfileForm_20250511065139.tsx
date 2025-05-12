"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface OrganizerProfileFormProps {
  onSubmit: (data: OrganizerProfileData) => Promise<void>;
  onBack?: () => void;
}

export interface OrganizerProfileData {
  organizerName: string;
  bio?: string;
  logoStorageId?: string;
  bannerStorageId?: string;
  instagramHandle?: string;
  twitterHandle?: string;
}

export default function OrganizerProfileForm({ onSubmit, onBack }: OrganizerProfileFormProps) {
  const [organizerName, setOrganizerName] = useState("");
  const [bio, setBio] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await onSubmit({
        organizerName,
        bio,
        instagramHandle,
        twitterHandle,
      });
    } catch (err) {
      console.error("Profile submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile.");
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
          Share some details about your organization.
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
          className="focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Placeholder for Logo Upload */}
      <div className="space-y-2">
        <Label htmlFor="logo" className="text-slate-700 font-medium">
          Logo (Optional)
        </Label>
        <Input
          id="logo"
          type="file"
          accept="image/*"
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-slate-500">Recommended: Square image (e.g., JPG, PNG, SVG)</p>
      </div>

      {/* Placeholder for Banner Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="banner" className="text-slate-700 font-medium">
          Banner Image (Optional)
        </Label>
        <Input
          id="banner"
          type="file"
          accept="image/*"
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-slate-500">Recommended: Landscape image, 16:9 ratio (e.g., JPG, PNG)</p>
      </div>

      <h3 className="text-xl font-semibold text-slate-700 pt-4 border-t border-slate-200">
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
            placeholder="e.g., @YourOrg"
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
            placeholder="e.g., @YourOrgX"
            className="focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-4">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
            Back
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading || !organizerName.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 flex-grow sm:flex-grow-0 ml-auto"
        >
          {isLoading ? "Saving..." : "Save & Continue"}
        </Button>
      </div>
    </form>
  );
} 