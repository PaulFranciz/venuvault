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
  const [generalImageFiles, setGeneralImageFiles] = useState<File[]>(() => {
    return Array.isArray(formData.generalImageFiles) ? formData.generalImageFiles : [];
  });
  const [generalVideoFiles, setGeneralVideoFiles] = useState<File[]>(() => {
    return Array.isArray(formData.generalVideoFiles) ? formData.generalVideoFiles : [];
  });
  
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
    if (generalImageFiles && Array.isArray(generalImageFiles)) {
      generalImageFiles.forEach(file => newUrls.push(URL.createObjectURL(file)));
    }
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
            title="Event Agenda"
            description="Create a detailed schedule of activities, sessions, and important moments for your event"
            icon={<Calendar className="h-6 w-6 text-[#F96521] shrink-0" />}
            isEnabled={agendaEnabled}
            onToggle={setAgendaEnabled}
          >
            <div className="space-y-4">
              <div className="bg-[#252525] rounded-lg p-4 border border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <Label className="text-sm font-pally-medium text-gray-300 mb-2 block">Activity Title</Label>
                    <Input
                      ref={agendaInputRef}
                      value={newAgendaTitle}
                      onChange={(e) => setNewAgendaTitle(e.target.value)}
                      placeholder="e.g., Opening Keynote, Networking Break, Workshop"
                      className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-[#F96521] focus:ring-[#F96521]/20 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-pally-medium text-gray-300 mb-2 block">Start Time</Label>
                    <Input
                      value={newAgendaStartTime}
                      onChange={(e) => setNewAgendaStartTime(e.target.value)}
                      placeholder="e.g., 7:00 PM"
                      className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-[#F96521] focus:ring-[#F96521]/20 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-pally-medium text-gray-300 mb-2 block">End Time</Label>
                    <Input
                      value={newAgendaEndTime}
                      onChange={(e) => setNewAgendaEndTime(e.target.value)}
                      placeholder="e.g., 8:00 PM"
                      className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-[#F96521] focus:ring-[#F96521]/20 h-11"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-pally-medium text-gray-300 mb-2 block">Description (Optional)</Label>
                    <Input
                      value={newAgendaDescription}
                      onChange={(e) => setNewAgendaDescription(e.target.value)}
                      placeholder="Brief description of the activity"
                      className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-[#F96521] focus:ring-[#F96521]/20 h-11"
                      onKeyDown={(e) => e.key === 'Enter' && addAgendaItem()}
                    />
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={addAgendaItem} 
                  disabled={!newAgendaTitle.trim()}
                  className="bg-[#F96521] hover:bg-[#F96521]/90 text-white font-pally-medium disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Agenda Item
                </Button>
              </div>
              
              {formData.agenda && formData.agenda.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  <h4 className="text-sm font-pally-medium text-gray-300 mb-3">Agenda Items ({formData.agenda.length})</h4>
                  {formData.agenda.map((item, index) => (
                    <div key={index} className="group bg-[#252525] rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-[#F96521]/20 rounded-full flex items-center justify-center">
                              <Clock className="h-4 w-4 text-[#F96521]" />
                            </div>
                            <h5 className="font-pally-medium text-white">{item.title}</h5>
                          </div>
                          <div className="ml-11">
                            <p className="text-sm text-[#F96521] font-pally-medium mb-1">
                              {item.startTime} - {item.endTime}
                            </p>
                            {item.description && (
                              <p className="text-sm text-gray-400 font-pally-regular">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeAgendaItem(index)} 
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {(formData.agenda?.length || 0) === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                  <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-pally-regular">No agenda items yet</p>
                  <p className="text-gray-500 text-xs font-pally-regular mt-1">Add your first activity using the form above</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Media & Previews Section */}
          <SectionCard
            title="Event Media & Previews"
            description="Upload images, videos, and audio clips to showcase your event and attract attendees"
            icon={<Camera className="h-6 w-6 text-[#F96521] shrink-0" />}
            isEnabled={mediaPreviewsEnabled}
            onToggle={setMediaPreviewsEnabled}
          >
            <div className="space-y-8">
              {/* Hidden File Inputs */}
              <input type="file" accept="audio/*" ref={audioFileInputRef} onChange={(e) => handleFileChange(e, 'audioSnippetFile')} style={{ display: 'none' }} />
              <input type="file" accept="video/*" ref={videoFileInputRef} onChange={(e) => handleFileChange(e, 'videoSnippetFile')} style={{ display: 'none' }} />
              <input type="file" accept="image/*" multiple ref={generalImagesInputRef} onChange={(e) => handleMultipleFilesChange(e, 'generalImageFiles')} style={{ display: 'none' }} />
              <input type="file" accept="video/*" multiple ref={generalVideosInputRef} onChange={(e) => handleMultipleFilesChange(e, 'generalVideoFiles')} style={{ display: 'none' }} />

              {/* Audio Snippet Section */}
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-pally-medium text-white mb-2 block flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#F96521]" />
                    Audio Preview
                    <span className="text-xs bg-gray-700 rounded-full px-2 py-1 text-gray-400 font-pally-regular">Max 1 file</span>
                  </Label>
                  <p className="text-sm text-gray-400 mb-3">Upload a short audio clip to give attendees a preview of your event</p>
                  {!audioSnippetFile ? (
                    <Button 
                      variant="outline" 
                      className="w-full h-20 border-2 border-dashed border-gray-600 hover:border-[#F96521]/50 text-gray-400 hover:text-gray-300 bg-[#252525] hover:bg-[#2A2A2A] transition-all duration-200"
                      onClick={() => audioFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <UploadCloud className="h-6 w-6" />
                        <span className="text-sm font-pally-medium">Click to upload audio file</span>
                        <span className="text-xs text-gray-500">MP3, WAV, or M4A (Max 10MB)</span>
                      </div>
                    </Button>
                  ) : (
                    <div className="bg-[#252525] border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#F96521]/20 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-[#F96521]" />
                          </div>
                          <div>
                            <p className="text-sm font-pally-medium text-white truncate" title={audioSnippetFile.name}>
                              {audioSnippetFile.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {(audioSnippetFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFile('audioSnippetFile')} 
                          className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Snippet Section */}
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-pally-medium text-white mb-2 block flex items-center gap-2">
                    <VideoIcon className="h-4 w-4 text-[#F96521]" />
                    Video Preview
                    <span className="text-xs bg-gray-700 rounded-full px-2 py-1 text-gray-400 font-pally-regular">Max 1 file</span>
                  </Label>
                  <p className="text-sm text-gray-400 mb-3">Upload a short video preview to showcase your event highlights</p>
                  {!videoSnippetFile ? (
                    <Button 
                      variant="outline" 
                      className="w-full h-20 border-2 border-dashed border-gray-600 hover:border-[#F96521]/50 text-gray-400 hover:text-gray-300 bg-[#252525] hover:bg-[#2A2A2A] transition-all duration-200"
                      onClick={() => videoFileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <UploadCloud className="h-6 w-6" />
                        <span className="text-sm font-pally-medium">Click to upload video file</span>
                        <span className="text-xs text-gray-500">MP4, MOV, or AVI (Max 50MB)</span>
                      </div>
                    </Button>
                  ) : (
                    <div className="bg-[#252525] border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#F96521]/20 rounded-lg flex items-center justify-center">
                            <VideoIcon className="h-5 w-5 text-[#F96521]" />
                          </div>
                          <div>
                            <p className="text-sm font-pally-medium text-white truncate" title={videoSnippetFile.name}>
                              {videoSnippetFile.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {(videoSnippetFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeFile('videoSnippetFile')} 
                          className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* General Images Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-pally-medium text-white mb-2 block flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[#F96521]" />
                    Event Gallery
                    <span className="text-xs bg-gray-700 rounded-full px-2 py-1 text-gray-400 font-pally-regular">Multiple files</span>
                  </Label>
                  <p className="text-sm text-gray-400 mb-4">Upload images that showcase your event venue, previous events, or promotional material</p>
                  <Button 
                    variant="outline" 
                    className="w-full h-16 border-2 border-dashed border-gray-600 hover:border-[#F96521]/50 text-gray-400 hover:text-gray-300 bg-[#252525] hover:bg-[#2A2A2A] transition-all duration-200"
                    onClick={() => generalImagesInputRef.current?.click()}
                  >
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5" />
                      <div className="text-left">
                        <span className="text-sm font-pally-medium block">Add Images to Gallery</span>
                        <span className="text-xs text-gray-500">JPG, PNG, WebP (Max 5MB each)</span>
                      </div>
                    </div>
                  </Button>
                </div>
                
                {generalImagePreviewUrls.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-pally-medium text-gray-300">Gallery Images ({generalImagePreviewUrls.length})</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {generalImagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group aspect-square bg-[#2C2C2C] rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors">
                          <Image src={url} alt={`Gallery image ${index + 1}`} layout="fill" objectFit="cover" className="rounded-lg" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              onClick={() => removeFile('generalImageFiles', index)} 
                              className="h-8 w-8 bg-red-600/80 hover:bg-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {generalImageFiles.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-700 rounded-lg">
                    <ImageIcon className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm font-pally-regular">No images in gallery</p>
                    <p className="text-gray-500 text-xs font-pally-regular mt-1">Click above to add your first image</p>
                  </div>
                )}
              </div>

              {/* General Videos Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-pally-medium text-white mb-2 block flex items-center gap-2">
                    <VideoIcon className="h-4 w-4 text-[#F96521]" />
                    Event Videos
                    <span className="text-xs bg-gray-700 rounded-full px-2 py-1 text-gray-400 font-pally-regular">Multiple files</span>
                  </Label>
                  <p className="text-sm text-gray-400 mb-4">Upload promotional videos, testimonials, or event highlights</p>
                  <Button 
                    variant="outline" 
                    className="w-full h-16 border-2 border-dashed border-gray-600 hover:border-[#F96521]/50 text-gray-400 hover:text-gray-300 bg-[#252525] hover:bg-[#2A2A2A] transition-all duration-200"
                    onClick={() => generalVideosInputRef.current?.click()}
                  >
                    <div className="flex items-center gap-3">
                      <VideoIcon className="h-5 w-5" />
                      <div className="text-left">
                        <span className="text-sm font-pally-medium block">Add Videos</span>
                        <span className="text-xs text-gray-500">MP4, MOV, AVI (Max 100MB each)</span>
                      </div>
                    </div>
                  </Button>
                </div>
                
                {generalVideoFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-pally-medium text-gray-300">Event Videos ({generalVideoFiles.length})</h4>
                    <div className="space-y-3">
                      {generalVideoFiles.map((file, index) => (
                        <div key={index} className="group bg-[#252525] rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#F96521]/20 rounded-lg flex items-center justify-center">
                                <VideoIcon className="h-5 w-5 text-[#F96521]" />
                              </div>
                              <div>
                                <p className="text-sm font-pally-medium text-white truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeFile('generalVideoFiles', index)} 
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {generalVideoFiles.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-700 rounded-lg">
                    <VideoIcon className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm font-pally-regular">No videos added</p>
                    <p className="text-gray-500 text-xs font-pally-regular mt-1">Click above to add your first video</p>
                  </div>
                )}
              </div>

            </div>
          </SectionCard>

          {/* Guest List Section */}
          <SectionCard
            title="Featured Guests & Speakers"
            description="Highlight special guests, speakers, or VIPs attending your event"
            icon={<Users className="h-6 w-6 text-[#F96521] shrink-0" />}
            isEnabled={guestListEnabled}
            onToggle={setGuestListEnabled}
          >
            <div className="space-y-4">
              <div className="bg-[#252525] rounded-lg p-4 border border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-pally-medium text-gray-300 mb-2 block">Full Name</Label>
                    <Input
                      ref={guestInputRef}
                      value={newGuestName}
                      onChange={(e) => setNewGuestName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-[#F96521] focus:ring-[#F96521]/20 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-pally-medium text-gray-300 mb-2 block">Email Address</Label>
                    <Input
                      value={newGuestEmail}
                      onChange={(e) => setNewGuestEmail(e.target.value)}
                      placeholder="john@example.com"
                      type="email"
                      className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-[#F96521] focus:ring-[#F96521]/20 h-11"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-pally-medium text-gray-300 mb-2 block">Role or Title</Label>
                    <Input
                      value={newGuestRole}
                      onChange={(e) => setNewGuestRole(e.target.value)}
                      placeholder="e.g., Keynote Speaker, Industry Expert, Special Guest"
                      className="bg-[#2C2C2C] border-[#3B3B3B] text-white font-pally-regular focus:border-[#F96521] focus:ring-[#F96521]/20 h-11"
                      onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                    />
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={addGuest} 
                  disabled={!newGuestName.trim()}
                  className="bg-[#F96521] hover:bg-[#F96521]/90 text-white font-pally-medium disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Guest
                </Button>
              </div>
              
              {formData.guestList && formData.guestList.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  <h4 className="text-sm font-pally-medium text-gray-300 mb-3">Featured Guests ({formData.guestList.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {formData.guestList.map((guest, index) => (
                      <div key={index} className="group bg-[#252525] rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors relative">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#F96521] to-[#F96521]/80 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-pally-bold text-sm">
                              {guest.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-pally-medium text-white truncate">{guest.name}</h5>
                            <p className="text-sm text-[#F96521] font-pally-medium mb-1">{guest.role}</p>
                            <p className="text-xs text-gray-400 font-pally-regular truncate">{guest.email}</p>
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeGuest(index)} 
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(formData.guestList?.length || 0) === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                  <Users className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-pally-regular">No featured guests yet</p>
                  <p className="text-gray-500 text-xs font-pally-regular mt-1">Add speakers, VIPs, or special guests using the form above</p>
                </div>
              )}
            </div>
          </SectionCard>

        </div>
      </div>

      <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-800/50">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack} 
          className="px-8 py-3 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white font-pally-medium"
        >
          ← Previous Step
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            Step 4 of 6
          </div>
          <Button 
            type="button" 
            onClick={onNext} 
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#F96521] hover:bg-[#F96521]/90 text-white font-pally-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Spinner />
                <span>Processing...</span>
              </div>
            ) : (
              <span>Continue →</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DetailsStep;
