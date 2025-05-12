'use client';

import { useState, ChangeEvent, FormEvent } from \'react';
import { motion } from 'framer-motion';
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UploadCloud, Instagram, Twitter, Link as LinkIcon } from \'lucide-react\';

interface OrganizerInfoFormProps {
  onSuccess: (data: { organizerName: string; socials: SocialLinks; logoStorageId?: string; bannerStorageId?: string }) => void;
}

interface SocialLinks {
  instagram: string;
  twitter: string;
  website: string;
}

export default function OrganizerInfoForm({ onSuccess }: OrganizerInfoFormProps) {
  const { user } = useUser();
  const [organizerName, setOrganizerName] = useState(\'\');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: \'\',
    twitter: \'\',
    website: \'\',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrganizerProfileDetails = useMutation(api.users.updateOrganizerProfileDetails);

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (preview: string | null) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError(\`File ${file.name} is too large (max 5MB).\`);
        e.target.value = \'\';
        setFile(null);
        setPreview(null);
        return;
      }
      if (![\'image/jpeg', \'image/png', \'image/webp', \'image/gif\'].includes(file.type)) {
        setError(\`File ${file.name} has an unsupported format.\`);
        e.target.value = \'\';
        setFile(null);
        setPreview(null);
        return;
      }
      setError(null);
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

  const handleSocialLinkChange = (e: ChangeEvent<HTMLInputElement>, platform: keyof SocialLinks) => {
    setSocialLinks(prev => ({ ...prev, [platform]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setError("User not authenticated. Please sign in.");
      return;
    }
    if (!organizerName.trim()) {
      setError("Organizer name is required.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      let logoStorageId: string | undefined = undefined;
      let bannerStorageId: string | undefined = undefined;

      if (logoFile) {
        console.warn("Placeholder: Actual logo file upload to Convex storage needed.");
        logoStorageId = \`simulated_logo_${Date.now()}\`;
      }
      if (bannerFile) {
        console.warn("Placeholder: Actual banner file upload to Convex storage needed.");
        bannerStorageId = \`simulated_banner_${Date.now()}\`;
      }

      await updateOrganizerProfileDetails({
        organizerName: organizerName.trim(),
        socials: socialLinks,
        logoStorageId: logoStorageId,
        bannerStorageId: bannerStorageId,
      });
      
      console.log("Profile details submitted to Convex successfully (simulated).");
      onSuccess({ organizerName, socialLinks, logoStorageId, bannerStorageId });

    } catch (err) {
      console.error("Failed to update profile via Convex:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during submission.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const inputVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div 
      className="max-w-2xl mx-auto p-6 md:p-8 bg-white rounded-xl shadow-2xl"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-800">Set Up Your Organizer Profile</h2>
        <p className="text-gray-500 mt-2">Tell us a bit about your organization.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <motion.div variants={inputVariants}>
          <Label htmlFor="organizerName" className="text-sm font-medium text-gray-700">Organizer Name</Label>
          <Input
            id="organizerName"
            type="text"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder="e.g., Awesome Event Co."
            required
            className="mt-1"
          />
        </motion.div>

        {/* Logo Upload */}
        <motion.div variants={inputVariants}>
          <Label htmlFor="logo" className="text-sm font-medium text-gray-700">Organizer Logo (Max 5MB)</Label>
          <div className="mt-1 flex items-center space-x-4">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-full object-cover border border-gray-300" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-300">
                <UploadCloud size={32} />
              </div>
            )}
            <Input
              id="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </motion.div>

        {/* Banner Upload */}
        <motion.div variants={inputVariants}>
          <Label htmlFor="banner" className="text-sm font-medium text-gray-700">Profile Banner (Max 5MB)</Label>
          <div className="mt-1">
            {bannerPreview ? (
              <img src={bannerPreview} alt="Banner preview" className="w-full h-40 rounded-md object-cover border border-gray-300" />
            ) : (
              <div className="w-full h-40 rounded-md bg-gray-100 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300">
                <UploadCloud size={32} />
                <span className="mt-1 text-xs">Optional: Recommended 1200x400px</span>
              </div>
            )}
            <Input
              id="banner"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleFileChange(e, setBannerFile, setBannerPreview)}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </motion.div>
        
        {/* Social Media Links */}
        <motion.div variants={inputVariants} className="space-y-4">
           <div>
            <Label className="text-sm font-medium text-gray-700">Social Media & Website (Optional)</Label>
            <p className="text-xs text-gray-500 mb-2">Link your social profiles to connect with attendees.</p>
           </div>
          <div className="relative">
            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="url"
              value={socialLinks.instagram}
              onChange={(e) => handleSocialLinkChange(e, \'instagram\')}
              placeholder="Instagram URL (e.g., https://instagram.com/yourprofile)"
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="url"
              value={socialLinks.twitter}
              onChange={(e) => handleSocialLinkChange(e, \'twitter\')}
              placeholder="X / Twitter URL (e.g., https://twitter.com/yourprofile)"
              className="pl-10"
            />
          </div>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="url"
              value={socialLinks.website}
              onChange={(e) => handleSocialLinkChange(e, \'website\')}
              placeholder="Website URL (e.g., https://yourcompany.com)"
              className="pl-10"
            />
          </div>
        </motion.div>

        {error && (
          <motion.p 
            className="text-sm text-red-600 bg-red-50 p-3 rounded-md text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}

        <motion.div variants={inputVariants}>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base py-3" disabled={isLoading || !user}>
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              \'Save and Continue\'
            )}
          </Button>
           {!user && <p className="text-xs text-red-500 text-center mt-2">Please sign in to save your profile.</p>}
        </motion.div>
      </form>
    </motion.div>
  );
} 