import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { EventFormData } from '@/app/create-event/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Calendar, Users, Camera, Clock, UploadCloud, ImageIcon, Video as VideoIcon, FileText, Trash2 } from 'lucide-react';
import { useEventForm } from '@/providers/EventFormProvider';
import Spinner from '@/components/ui/spinner';

interface DetailsStepProps {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

const DetailsStep: React.FC<DetailsStepProps> = ({
  onNext,
  onBack,
  isSubmitting,
}) => {
  const { formData, setFormData } = useEventForm();
  
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestRole, setNewGuestRole] = useState('');
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaStartTime, setNewAgendaStartTime] = useState('');
  const [newAgendaEndTime, setNewAgendaEndTime] = useState('');
  const [newAgendaDescription, setNewAgendaDescription] = useState('');

  // Refs for inputs
  const agendaInputRef = useRef<HTMLInputElement>(null);
  const guestInputRef = useRef<HTMLInputElement>(null);

  const [agendaEnabled, setAgendaEnabled] = useState(formData.agendaEnabled || false);
  const [guestListEnabled, setGuestListEnabled] = useState(formData.guestListEnabled || false);
  const [mediaPreviewsEnabled, setMediaPreviewsEnabled] = useState(formData.mediaPreviewsEnabled || false);

  // Action flags for empty state interactions
  const [shouldFocusAgendaInput, setShouldFocusAgendaInput] = useState(false);
  const [shouldFocusGuestInput, setShouldFocusGuestInput] = useState(false);
  const [shouldClickAudioInput, setShouldClickAudioInput] = useState(false);

  // Refs for file inputs
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const generalImagesInputRef = useRef<HTMLInputElement>(null);
  const generalVideosInputRef = useRef<HTMLInputElement>(null);

  // State for selected media files
  const [audioSnippetFile, setAudioSnippetFile] = useState<File | undefined>(formData.audioSnippetFile);
  const [videoSnippetFile, setVideoSnippetFile] = useState<File | undefined>(formData.videoSnippetFile);
  const [generalImageFiles, setGeneralImageFiles] = useState<File[]>(formData.generalImageFiles || []);
  const [generalVideoFiles, setGeneralVideoFiles] = useState<File[]>(formData.generalVideoFiles || []);
  
  const [generalImagePreviewUrls, setGeneralImagePreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    // This effect correctly updates formData when toggles change
    setFormData({ 
      agendaEnabled, 
      guestListEnabled, 
      mediaPreviewsEnabled 
    });
  }, [agendaEnabled, guestListEnabled, mediaPreviewsEnabled, setFormData]);

  useEffect(() => {
    setAgendaEnabled(formData.agendaEnabled || false);
    setGuestListEnabled(formData.guestListEnabled || false);
    setMediaPreviewsEnabled(formData.mediaPreviewsEnabled || false);
    // Initialize local file states from formData on mount or when formData changes externally
    setAudioSnippetFile(formData.audioSnippetFile);
    setVideoSnippetFile(formData.videoSnippetFile);
    setGeneralImageFiles(formData.generalImageFiles || []);
    setGeneralVideoFiles(formData.generalVideoFiles || []);
  }, [formData.agendaEnabled, formData.guestListEnabled, formData.mediaPreviewsEnabled, 
      formData.audioSnippetFile, formData.videoSnippetFile, formData.generalImageFiles, formData.generalVideoFiles]);

  // Effect to create/revoke preview URLs for general images
  useEffect(() => {
    const newUrls: string[] = [];
    generalImageFiles.forEach(file => newUrls.push(URL.createObjectURL(file)));
    setGeneralImagePreviewUrls(newUrls);

    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [generalImageFiles]);

  // useEffects for handling deferred actions after state updates
  useEffect(() => {
    if (shouldFocusAgendaInput && agendaEnabled && agendaInputRef.current) {
      agendaInputRef.current.focus();
      setShouldFocusAgendaInput(false);
    }
  }, [shouldFocusAgendaInput, agendaEnabled]);

  useEffect(() => {
    if (shouldFocusGuestInput && guestListEnabled && guestInputRef.current) {
      guestInputRef.current.focus();
      setShouldFocusGuestInput(false);
    }
  }, [shouldFocusGuestInput, guestListEnabled]);

  useEffect(() => {
    if (shouldClickAudioInput && mediaPreviewsEnabled && audioFileInputRef.current) {
      audioFileInputRef.current.click();
      setShouldClickAudioInput(false);
    }
  }, [shouldClickAudioInput, mediaPreviewsEnabled]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: keyof EventFormData) => {
    const file = event.target.files?.[0];
    if (file) {
      if (fileType === 'audioSnippetFile') {
        setAudioSnippetFile(file);
        setFormData({ audioSnippetFile: file });
      } else if (fileType === 'videoSnippetFile') {
        setVideoSnippetFile(file);
        setFormData({ videoSnippetFile: file });
      }
    }
    if (event.target) event.target.value = '';
  };

  const handleMultipleFilesChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'generalImageFiles' | 'generalVideoFiles') => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      if (fileType === 'generalImageFiles') {
        const updatedFiles = [...generalImageFiles, ...files];
        setGeneralImageFiles(updatedFiles);
        setFormData({ generalImageFiles: updatedFiles });
      } else if (fileType === 'generalVideoFiles') {
        const updatedFiles = [...generalVideoFiles, ...files];
        setGeneralVideoFiles(updatedFiles);
        setFormData({ generalVideoFiles: updatedFiles });
      }
    }
    if (event.target) event.target.value = '';
  };

  const removeFile = (fileType: keyof EventFormData, index?: number) => {
    if (fileType === 'audioSnippetFile') {
      setAudioSnippetFile(undefined);
      setFormData({ audioSnippetFile: undefined, audioSnippetUrl: undefined });
    } else if (fileType === 'videoSnippetFile') {
      setVideoSnippetFile(undefined);
      setFormData({ videoSnippetFile: undefined, videoSnippetUrl: undefined });
    } else if (fileType === 'generalImageFiles' && index !== undefined) {
      const updatedFiles = generalImageFiles.filter((_, i) => i !== index);
      setGeneralImageFiles(updatedFiles);
      setFormData({ generalImageFiles: updatedFiles });
    } else if (fileType === 'generalVideoFiles' && index !== undefined) {
      const updatedFiles = generalVideoFiles.filter((_, i) => i !== index);
      setGeneralVideoFiles(updatedFiles);
      setFormData({ generalVideoFiles: updatedFiles });
    }
  };

  const addGuest = () => {
    if (newGuestName.trim()) {
      const newGuestItem = {
        name: newGuestName.trim(),
        email: newGuestEmail.trim(),
        role: newGuestRole.trim()
      };
      const updatedGuestList = [...(formData.guestList || []), newGuestItem];
      setFormData({ guestList: updatedGuestList });
      setNewGuestName('');
      setNewGuestEmail('');
      setNewGuestRole('');
    }
  };

  const removeGuest = (index: number) => {
    const updatedGuestList = formData.guestList?.filter((_, i) => i !== index);
    setFormData({ guestList: updatedGuestList });
  };

  const addAgendaItem = () => {
    if (newAgendaTitle.trim()) {
      const newAgendaItem = {
        title: newAgendaTitle.trim(),
        startTime: newAgendaStartTime,
        endTime: newAgendaEndTime,
        description: newAgendaDescription.trim()
      };
      const updatedAgenda = [...(formData.agenda || []), newAgendaItem];
      setFormData({ agenda: updatedAgenda });
      setNewAgendaTitle('');
      setNewAgendaStartTime('');
      setNewAgendaEndTime('');
      setNewAgendaDescription('');
    }
  };

  const removeAgendaItem = (index: number) => {
    const updatedAgenda = formData.agenda?.filter((_, i) => i !== index);
    setFormData({ agenda: updatedAgenda });
  };

  // Handlers for empty state buttons
  const handleAddFirstAgendaItem = () => {
    setAgendaEnabled(true);
    setShouldFocusAgendaInput(true);
  };

  const handleAddFirstGuest = () => {
    setGuestListEnabled(true);
    setShouldFocusGuestInput(true);
  };

  const handleAddFirstMedia = () => {
    setMediaPreviewsEnabled(true);
    setShouldClickAudioInput(true);
  };

  // Enhanced SectionCard component with improved styling
  const SectionCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
    children: React.ReactNode;
  }> = ({
    title,
    description,
    icon,
    isEnabled,
    onToggle,
    children
  }) => (
    <div className={`bg-[#1E1E1E] rounded-xl p-6 border transition-all duration-200 ${
      isEnabled 
        ? 'border-[#F96521]/30 shadow-lg shadow-[#F96521]/5' 
        : 'border-gray-700/50 hover:border-gray-600/50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg transition-colors ${
            isEnabled ? 'bg-[#F96521]/20' : 'bg-gray-700/50'
          }`}>
            {icon}
          </div>
          <div>
            <h4 className="font-pally-medium text-lg text-white flex items-center gap-2">
              {title} 
              <span className="text-xs bg-[#2A2A2A] rounded-full px-3 py-1 text-gray-400 font-pally-regular uppercase tracking-wide">
                Optional
              </span>
            </h4>
            <p className="text-sm text-gray-400 font-pally-regular mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-[#F96521] data-[state=unchecked]:bg-gray-600 shrink-0 scale-110"
        />
      </div>
      {isEnabled && (
        <div className="mt-6 pt-6 border-t border-gray-700/30">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="text-white max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-pally-bold mb-2 text-white">Event Content & Details</h2>
        <p className="text-gray-400 font-pally-regular">Add optional content to make your event more engaging and informative</p>
      </div>
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] rounded-2xl p-8 border border-gray-800/50 shadow-2xl">
        <div className="space-y-8">
          {/* Agenda Section */}
          <SectionCard
            title="Agenda"
            description="Add a schedule of activities for your event"
            icon={<Calendar className="h-5 w-5 text-[#F96521] shrink-0" />}
            isEnabled={agendaEnabled}
            onToggle={setAgendaEnabled}
          >
            <div className="flex space-x-2 mb-3">
              <div className="flex flex-col space-y-2 w-full">
                <Input
                  ref={agendaInputRef} // Assign ref here
                  value={newAgendaTitle}
                  onChange={(e) => setNewAgendaTitle(e.target.value)}
                  placeholder="Title (e.g., Keynote)"
                  className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-red-500 focus:ring-red-500"
                />
                <div className="flex space-x-2">
                  <Input
                    value={newAgendaStartTime}
                    onChange={(e) => setNewAgendaStartTime(e.target.value)}
                    placeholder="Start Time (e.g., 7:00 PM)"
                    className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-red-500 focus:ring-red-500"
                  />
                  <Input
                    value={newAgendaEndTime}
                    onChange={(e) => setNewAgendaEndTime(e.target.value)}
                    placeholder="End Time (e.g., 8:00 PM)"
                    className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <Input
                  value={newAgendaDescription}
                  onChange={(e) => setNewAgendaDescription(e.target.value)}
                  placeholder="Description"
                  className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-red-500 focus:ring-red-500"
                  onKeyDown={(e) => e.key === 'Enter' && addAgendaItem()}
                />
              </div>
              <Button type="button" onClick={addAgendaItem} className="bg-[#F96521] hover:bg-[#F96521]/90 text-white font-pally-medium shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {formData.agenda?.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-[#2C2C2C] p-3 rounded-md">
                  <div className="flex flex-col">
                    <span className="font-pally-medium text-sm text-white">{item.title}</span>
                    <span className="font-pally-regular text-xs text-gray-300">{item.startTime} - {item.endTime}</span>
                    <span className="font-pally-regular text-xs text-gray-400">{item.description}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAgendaItem(index)} className="h-6 w-6 p-0 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(formData.agenda?.length || 0) === 0 && (
                <p className="text-center text-gray-400 text-sm py-3">No agenda items added yet. Use the input above to add your first item.</p>
              )}
            </div>
          </SectionCard>

          {/* Media & Previews Section */}
          <SectionCard
            title="Media & Previews"
            description="Add images, videos, and short audio/video previews for your event"
            icon={<Camera className="h-5 w-5 text-[#F96521] shrink-0" />}
            isEnabled={mediaPreviewsEnabled}
            onToggle={setMediaPreviewsEnabled}
          >
            <div className="space-y-6 pt-2">
              {/* Hidden File Inputs */}
              <input type="file" accept="audio/*" ref={audioFileInputRef} onChange={(e) => handleFileChange(e, 'audioSnippetFile')} style={{ display: 'none' }} />
              <input type="file" accept="video/*" ref={videoFileInputRef} onChange={(e) => handleFileChange(e, 'videoSnippetFile')} style={{ display: 'none' }} />
              <input type="file" accept="image/*" multiple ref={generalImagesInputRef} onChange={(e) => handleMultipleFilesChange(e, 'generalImageFiles')} style={{ display: 'none' }} />
              <input type="file" accept="video/*" multiple ref={generalVideosInputRef} onChange={(e) => handleMultipleFilesChange(e, 'generalVideoFiles')} style={{ display: 'none' }} />

              {/* Audio Snippet Section */}
              <div>
                <Label className="text-sm font-pally-medium text-gray-300 mb-1.5 block">Audio Snippet (Max 1)</Label>
                {!audioSnippetFile ? (
                  <Button variant="outline" className="w-full border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300"
                          onClick={() => audioFileInputRef.current?.click()}>
                    <UploadCloud className="h-4 w-4 mr-2" /> Upload Audio File
                  </Button>
                ) : (
                  <div className="flex items-center justify-between bg-[#2C2C2C] p-3 rounded-md">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-[#F96521] mr-2" />
                      <span className="text-sm text-gray-200 truncate" title={audioSnippetFile.name}>{audioSnippetFile.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile('audioSnippetFile')} className="text-gray-400 hover:text-red-500 h-7 w-7">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Video Snippet Section */}
              <div>
                <Label className="text-sm font-pally-medium text-gray-300 mb-1.5 block">Video Snippet (Max 1)</Label>
                {!videoSnippetFile ? (
                  <Button variant="outline" className="w-full border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300"
                          onClick={() => videoFileInputRef.current?.click()}>
                    <UploadCloud className="h-4 w-4 mr-2" /> Upload Video File
                  </Button>
                ) : (
                  <div className="flex items-center justify-between bg-[#2C2C2C] p-3 rounded-md">
                    <div className="flex items-center">
                      <VideoIcon className="h-5 w-5 text-[#F96521] mr-2" />
                      <span className="text-sm text-gray-200 truncate" title={videoSnippetFile.name}>{videoSnippetFile.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile('videoSnippetFile')} className="text-gray-400 hover:text-red-500 h-7 w-7">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* General Images Section */}
              <div>
                <Label className="text-sm font-pally-medium text-gray-300 mb-1.5 block">General Images (Add multiple)</Label>
                <Button variant="outline" className="w-full border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 mb-3"
                        onClick={() => generalImagesInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" /> Add Images
                </Button>
                {generalImagePreviewUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {generalImagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative group aspect-square bg-[#2C2C2C] rounded-md overflow-hidden">
                        <Image src={url} alt={`Preview ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" />
                        <Button variant="destructive" size="icon" 
                                onClick={() => removeFile('generalImageFiles', index)} 
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-red-600/80">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {generalImageFiles.length === 0 && (
                   <p className="text-xs text-center text-gray-500 py-2">No general images added.</p>
                )}
              </div>

              {/* General Videos Section */}
              <div>
                <Label className="text-sm font-pally-medium text-gray-300 mb-1.5 block">General Videos (Add multiple)</Label>
                <Button variant="outline" className="w-full border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 mb-3"
                        onClick={() => generalVideosInputRef.current?.click()}>
                  <VideoIcon className="h-4 w-4 mr-2" /> Add Videos
                </Button>
                {generalVideoFiles.length > 0 && (
                  <div className="space-y-2">
                    {generalVideoFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-[#2C2C2C] p-3 rounded-md">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-[#F96521] mr-2" />
                          <span className="text-sm text-gray-200 truncate" title={file.name}>{file.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFile('generalVideoFiles', index)} className="text-gray-400 hover:text-red-500 h-7 w-7">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                 {generalVideoFiles.length === 0 && (
                   <p className="text-xs text-center text-gray-500 py-2">No general videos added.</p>
                )}
              </div>

            </div>
          </SectionCard>

          {/* Guest List Section */}
          <SectionCard
            title="Guest List"
            description="Add specific guests to your event"
            icon={<Users className="h-5 w-5 text-[#F96521] shrink-0" />}
            isEnabled={guestListEnabled}
            onToggle={setGuestListEnabled}
          >
            <div className="flex space-x-2 mb-3">
              <div className="flex flex-col space-y-2 w-full">
                <Input
                  ref={guestInputRef}
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="Guest Name"
                  className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-red-500 focus:ring-red-500"
                />
                <Input
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                  placeholder="Email Address"
                  className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-red-500 focus:ring-red-500"
                />
                <Input
                  value={newGuestRole}
                  onChange={(e) => setNewGuestRole(e.target.value)}
                  placeholder="Role (e.g., Speaker, VIP)"
                  className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-red-500 focus:ring-red-500"
                  onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                />
              </div>
              <Button type="button" onClick={addGuest} className="bg-[#F96521] hover:bg-[#F96521]/90 text-white font-pally-medium shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {formData.guestList?.map((guest, index) => (
                <div key={index} className="flex items-center justify-between bg-[#2C2C2C] p-3 rounded-md">
                  <div className="flex flex-col">
                    <span className="font-pally-medium text-sm text-white">{guest.name}</span>
                    <span className="font-pally-regular text-xs text-gray-300">{guest.email}</span>
                    <span className="font-pally-regular text-xs text-gray-400">{guest.role}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeGuest(index)} className="h-6 w-6 p-0 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(formData.guestList?.length || 0) === 0 && (
                <p className="text-center text-gray-400 text-sm py-3">No guests added yet. Use the input above to add your first guest.</p>
              )}
            </div>
          </SectionCard>

        </div>
      </div>

      <div className="flex justify-between mt-10">
        <Button type="button" variant="outline" onClick={onBack} className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white">
          Previous
        </Button>
        <Button type="button" onClick={onNext} className="bg-[#F96521] hover:bg-[#F96521]/90 text-white">
          {isSubmitting ? <Spinner /> : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default DetailsStep;
