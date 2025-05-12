'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { Input } from '@/components/ui/input'; // Assuming you have an Input component
import { Label } from '@/components/ui/label'; // Assuming you have a Label component
import Spinner from '@/components/Spinner'; // Assuming you have a Spinner component

export default function OrganizerOnboardingPage() {
  const router = useRouter();
  const userProfile = useQuery(api.users.getUserProfile);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl); // Corrected API path

  const [organizerName, setOrganizerName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [instagramLink, setInstagramLink] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    } else {
      setter(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!organizerName.trim()) {
      setError('Organizer name is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      let logoStorageId: Id<"_storage"> | undefined = undefined;
      if (logoFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': logoFile.type },
          body: logoFile,
        });
        const { storageId } = await result.json();
        logoStorageId = storageId;
      }

      let bannerStorageId: Id<"_storage"> | undefined = undefined;
      if (bannerFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': bannerFile.type },
          body: bannerFile,
        });
        const { storageId } = await result.json();
        bannerStorageId = storageId;
      }

      await updateUserProfile({
        organizerName,
        logoStorageId,
        bannerStorageId,
        socialLinks: {
          instagram: instagramLink || undefined,
          twitter: twitterLink || undefined,
        },
        organizerProfileComplete: true,
      });

      router.push('/seller');
    } catch (err) {
      console.error('Failed to complete organizer onboarding:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (userProfile === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Redirect if already onboarded (organizer profile specifically)
  if (userProfile && userProfile.organizerProfileComplete) {
    router.push('/seller');
    return (
         <div className="flex items-center justify-center min-h-screen">
            <p>Redirecting...</p>
            <Spinner />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
            Set Up Your Organizer Profile
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-300">
            Tell us a bit about your organization to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg p-8 space-y-6">
          <div>
            <Label htmlFor="organizerName" className="block text-sm font-medium text-gray-700 mb-1">Organizer Name</Label>
            <Input
              id="organizerName"
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              required
              className="w-full"
              placeholder="e.g., Awesome Events Inc."
            />
          </div>

          <div>
            <Label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">Organization Logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleFileChange(setLogoFile)}
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {logoFile && <p className="text-xs text-gray-500 mt-1">Selected: {logoFile.name}</p>}
          </div>

          <div>
            <Label htmlFor="banner" className="block text-sm font-medium text-gray-700 mb-1">Profile Banner Image</Label>
            <Input
              id="banner"
              type="file"
              accept="image/*"
              onChange={handleFileChange(setBannerFile)}
              className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {bannerFile && <p className="text-xs text-gray-500 mt-1">Selected: {bannerFile.name}</p>}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-md font-medium text-gray-700">Social Media Links (Optional)</h3>
            <div>
              <Label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">Instagram</Label>
              <Input
                id="instagram"
                type="url"
                value={instagramLink}
                onChange={(e) => setInstagramLink(e.target.value)}
                className="w-full"
                placeholder="https://instagram.com/yourprofile"
              />
            </div>
            <div>
              <Label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">X / Twitter</Label>
              <Input
                id="twitter"
                type="url"
                value={twitterLink}
                onChange={(e) => setTwitterLink(e.target.value)}
                className="w-full"
                placeholder="https://x.com/yourprofile"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out disabled:opacity-70 flex items-center justify-center"
          >
            {isSubmitting ? <Spinner /> : 'Save and Continue'}
          </Button>
        </form>
      </div>
    </main>
  );
} 