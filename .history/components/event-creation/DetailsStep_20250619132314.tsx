import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { useEventForm } from '@/providers/EventFormProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Users, Mic, Calendar, Trash2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Spinner from '@/components/ui/spinner';

interface DetailsStepProps {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

const DetailsStep: React.FC<DetailsStepProps> = ({ onNext, onBack, isSubmitting }) => {
  const { formData, setFormData } = useEventForm();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const handleToggleChange = (id: 'agendaEnabled' | 'guestListEnabled') => {
    setFormData({ [id]: !formData[id] });
  };

  // --- Agenda Management ---
  const handleAgendaChange = (index: number, field: string, value: string) => {
    const newAgenda = [...(formData.agenda || [])];
    newAgenda[index] = { ...newAgenda[index], [field]: value };
    setFormData({ agenda: newAgenda });
  };

  const addAgendaItem = () => {
    const newAgenda = [...(formData.agenda || []), { title: '', startTime: '', endTime: '', description: '' }];
    setFormData({ agenda: newAgenda });
  };

  const removeAgendaItem = (index: number) => {
    const newAgenda = (formData.agenda || []).filter((_, i) => i !== index);
    setFormData({ agenda: newAgenda });
  };

  // --- Guest List Management ---
  const handleGuestChange = (index: number, field: string, value: string) => {
    const newGuests = [...(formData.guestList || [])];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setFormData({ guestList: newGuests });
  };

  const addGuestItem = () => {
    const newGuests = [...(formData.guestList || []), { name: '', email: '', role: '' }];
    setFormData({ guestList: newGuests });
  };

  const removeGuestItem = (index: number) => {
    const newGuests = (formData.guestList || []).filter((_, i) => i !== index);
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

  const renderSectionToggle = (id: 'agendaEnabled' | 'guestListEnabled', label: string, Icon: React.ElementType) => (
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
        
        <div className="space-y-4">
            {formData.headliners?.map((headliner, index) => (
            <div key={`headliner-${index}`} className="bg-[#2C2C2C] p-4 rounded-lg border border-[#3B3B3B] space-y-4 relative">
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
                        <Image src={headliner.imageUrl} alt={headliner.name || 'Headliner'} layout="fill" objectFit="cover" />
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
        </div>

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
            <div key={`agenda-${index}`} className="bg-[#2C2C2C] p-4 rounded-lg border border-[#3B3B3B] space-y-3 relative">
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
          <Button type="button" variant="outline" onClick={addAgendaItem} className="border-[#F96521] text-[#F96521] hover:bg-[#F96521]/10">
            <Plus className="h-4 w-4 mr-2" /> Add Agenda Item
          </Button>
        </div>
      )}

      {/* Guest List Section */}
      {formData.guestListEnabled && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Guest List</h3>
          {formData.guestList?.map((guest, index) => (
            <div key={`guest-${index}`} className="bg-[#2C2C2C] p-4 rounded-lg border border-[#3B3B3B] space-y-3 relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-transparent" onClick={() => removeGuestItem(index)}>
                <X className="h-4 w-4" />
              </Button>
              <Input value={guest.name} onChange={(e) => handleGuestChange(index, 'name', e.target.value)} placeholder="Guest Name" className="bg-[#212121] border-[#3B3B3B]" />
              <Input value={guest.email} onChange={(e) => handleGuestChange(index, 'email', e.target.value)} placeholder="Guest Email" className="bg-[#212121] border-[#3B3B3B]" />
              <Input value={guest.role} onChange={(e) => handleGuestChange(index, 'role', e.target.value)} placeholder="Role (e.g., VIP, Speaker)" className="bg-[#212121] border-[#3B3B3B]" />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addGuestItem} className="border-[#F96521] text-[#F96521] hover:bg-[#F96521]/10">
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
