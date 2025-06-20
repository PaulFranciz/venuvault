import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { EventFormData } from '@/app/create-event/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Calendar, Users, Camera, Clock, UploadCloud, ImageIcon, Video as VideoIcon, FileText, Trash2, Mic } from 'lucide-react';
import { useEventForm } from '@/providers/EventFormProvider';
import Spinner from '@/components/ui/spinner';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

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
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  
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

  const handleToggleChange = (id: 'agendaEnabled' | 'guestListEnabled' | 'mediaPreviewsEnabled') => {
    setFormData({ [id]: !formData[id] });
  };

  // --- Agenda Management ---
  const handleAgendaChange = (index: number, field: string, value: string) => {
    const newAgenda = [...(formData.agenda || [])];
    newAgenda[index] = { ...newAgenda[index], [field]: value };
    setFormData({ agenda: newAgenda });
  };

  // --- Guest List Management ---
  const handleGuestChange = (index: number, field: string, value: string) => {
    const newGuests = [...(formData.guestList || [])];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setFormData({ guestList: newGuests });
  };

  // --- Headliner Management ---
  const handleHeadlinerChange = (index: number, field: 'name' | 'role', value: string) => {
    const newHeadliners = [...(formData.headliners || [])];
    newHeadliners[index] = { ...newHeadliners[index], [field]: value };
    setFormData({ headliners: newHeadliners });
  };
  
  const handleHeadlinerImageUpload = async (index: number, file: File) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [`headliner-${index}`]: true }));
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();
      const newHeadliners = [...(formData.headliners || [])];
      newHeadliners[index] = {
        ...newHeadliners[index],
        image: file,
        imageUrl: URL.createObjectURL(file), // For optimistic update
        imageStorageId: storageId,
      };
      setFormData({ headliners: newHeadliners });

    } catch (error) {
      console.error("Error uploading headliner image:", error);
    } finally {
      setUploading(prev => ({ ...prev, [`headliner-${index}`]: false }));
    }
  };

  const addHeadlinerItem = () => {
    const newHeadliners = [...(formData.headliners || []), { name: '', role: 'Artist' }];
    setFormData({ headliners: newHeadliners });
  };

  const removeHeadlinerItem = (index: number) => {
    const newHeadliners = (formData.headliners || []).filter((_, i) => i !== index);
    setFormData({ headliners: newHeadliners });
  };

  const renderSectionToggle = (id: 'agendaEnabled' | 'guestListEnabled' | 'mediaPreviewsEnabled', label: string, Icon: React.ElementType) => (
    <div className="flex items-center justify-between p-4 bg-[#2C2C2C] rounded-lg border border-[#3B3B3B]">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#F96521]" />
        <Label htmlFor={id} className="text-white font-medium">{label}</Label>
      </div>
      <Switch
        id={id}
        checked={!!formData[id]}
        onCheckedChange={() => handleToggleChange(id)}
      />
    </div>
  );

  return (
    <div className="text-white space-y-8">
      {/* Headliners Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Mic className="text-[#F96521]" />
          Headliners & Special Guests
        </h2>
        <p className="text-sm text-gray-400">Highlight the key people who will be at your event.</p>
        
        {formData.headliners?.map((headliner, index) => (
          <div key={index} className="bg-[#2C2C2C] p-4 rounded-lg border border-[#3B3B3B] space-y-4 relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-transparent"
              onClick={() => removeHeadlinerItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 space-y-2">
                <Label>Image</Label>
                <div className="w-24 h-24 bg-[#3B3B3B] rounded-lg flex items-center justify-center relative overflow-hidden">
                  {uploading[`headliner-${index}`] ? (
                    <Spinner />
                  ) : headliner.imageUrl ? (
                    <Image src={headliner.imageUrl} alt={headliner.name} layout="fill" objectFit="cover" />
                  ) : (
                    <Users className="h-8 w-8 text-gray-500" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => e.target.files && handleHeadlinerImageUpload(index, e.target.files[0])}
                    disabled={uploading[`headliner-${index}`]}
                  />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor={`headliner-name-${index}`}>Name</Label>
                  <Input
                    id={`headliner-name-${index}`}
                    value={headliner.name}
                    onChange={(e) => handleHeadlinerChange(index, 'name', e.target.value)}
                    placeholder="e.g., Burna Boy"
                    className="bg-[#212121] border-[#3B3B3B]"
                  />
                </div>
                <div>
                  <Label htmlFor={`headliner-role-${index}`}>Role</Label>
                  <Select
                    value={headliner.role}
                    onValueChange={(value) => handleHeadlinerChange(index, 'role', value)}
                  >
                    <SelectTrigger id={`headliner-role-${index}`} className="bg-[#212121] border-[#3B3B3B]">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Artist">Artist</SelectItem>
                      <SelectItem value="DJ">DJ</SelectItem>
                      <SelectItem value="Speaker">Speaker</SelectItem>
                      <SelectItem value="Host">Host</SelectItem>
                      <SelectItem value="Panelist">Panelist</SelectItem>
                      <SelectItem value="Special Guest">Special Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addHeadlinerItem} className="border-[#F96521] text-[#F96521] hover:bg-[#F96521]/10">
          <Plus className="h-4 w-4 mr-2" />
          Add Headliner
        </Button>
      </div>

      {/* Toggles for optional sections */}
      <div className="space-y-4">
        {renderSectionToggle('agendaEnabled', 'Add Event Agenda', Calendar)}
        {renderSectionToggle('guestListEnabled', 'Add Guest List', Users)}
      </div>

      {/* Agenda Section */}
      {formData.agendaEnabled && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Event Agenda</h3>
          {formData.agenda?.map((item, index) => (
            <div key={index} className="bg-[#2C2C2C] p-4 rounded-lg border border-[#3B3B3B] space-y-3 relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-transparent" onClick={() => removeAgendaItem(index)}>
                <X className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <Input value={item.startTime} onChange={(e) => handleAgendaChange(index, 'startTime', e.target.value)} placeholder="Start Time (e.g., 09:00)" className="bg-[#212121] border-[#3B3B3B]" />
                <Input value={item.endTime} onChange={(e) => handleAgendaChange(index, 'endTime', e.target.value)} placeholder="End Time (e.g., 10:00)" className="bg-[#212121] border-[#3B3B3B]" />
              </div>
              <Input value={item.title} onChange={(e) => handleAgendaChange(index, 'title', e.target.value)} placeholder="Title (e.g., Opening Keynote)" className="bg-[#212121] border-[#3B3B3B]" />
              <Textarea value={item.description} onChange={(e) => handleAgendaChange(index, 'description', e.target.value)} placeholder="Description..." className="bg-[#212121] border-[#3B3B3B]" />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addAgendaItem} className="border-[#F96521] text-[#F96521] hover:bg-[#F9_6521]/10">
            <Plus className="h-4 w-4 mr-2" /> Add Agenda Item
          </Button>
        </div>
      )}

      {/* Guest List Section */}
      {formData.guestListEnabled && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Guest List</h3>
          {formData.guestList?.map((guest, index) => (
            <div key={index} className="bg-[#2C2C2C] p-4 rounded-lg border border-[#3B3B3B] space-y-3 relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-transparent" onClick={() => removeGuest(index)}>
                <X className="h-4 w-4" />
              </Button>
              <Input value={guest.name} onChange={(e) => handleGuestChange(index, 'name', e.target.value)} placeholder="Guest Name" className="bg-[#212121] border-[#3B3B3B]" />
              <Input value={guest.email} onChange={(e) => handleGuestChange(index, 'email', e.target.value)} placeholder="Guest Email" className="bg-[#212121] border-[#3B3B3B]" />
              <Input value={guest.role} onChange={(e) => handleGuestChange(index, 'role', e.target.value)} placeholder="Role (e.g., VIP, Speaker)" className="bg-[#212121] border-[#3B3B3B]" />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addGuest} className="border-[#F96521] text-[#F96521] hover:bg-[#F96521]/10">
            <Plus className="h-4 w-4 mr-2" /> Add Guest
          </Button>
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        {onBack && (
          <Button type="button" onClick={onBack} variant="outline" className="bg-transparent border-[#F96521] text-[#F96521] hover:bg-[#F96521]/10" disabled={isSubmitting}>
            Back
          </Button>
        )}
        <Button type="button" onClick={onNext} className="bg-[#F96521] hover:bg-[#F96521]/90 text-white ml-auto" disabled={isSubmitting}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default DetailsStep;
