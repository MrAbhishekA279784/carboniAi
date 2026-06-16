import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';
import { UserProfile } from '../../types';

export function ProfileEditModal({ trigger }: { trigger: React.ReactElement }) {
  const user = useAppStore(s => s.user);
  const setUser = useAppStore(s => s.setUser);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    city: user.city,
    occupation: user.occupation,
    foodPreference: user.foodPreference,
    transportMode: user.transportMode,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser(formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Edit Profile Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-md" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">City</label>
            <input name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Occupation</label>
            <input name="occupation" value={formData.occupation} onChange={handleChange} className="w-full p-2 border rounded-md" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dietary Preference</label>
            <select name="foodPreference" value={formData.foodPreference} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="Omnivore">Omnivore</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Pescatarian">Pescatarian</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Transport</label>
            <select name="transportMode" value={formData.transportMode} onChange={handleChange} className="w-full p-2 border rounded-md">
              <option value="Car">Car</option>
              <option value="Public Transport">Public Transport</option>
              <option value="Bicycle">Bicycle</option>
              <option value="Walking">Walking</option>
            </select>
          </div>
          <Button type="submit" className="w-full">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HelpSupportModal({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">Need help with CarbonIQ? Reach out to us or check our resources below.</p>
          
          <div className="space-y-2">
            <div className="p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 flex justify-between items-center">
               <span className="font-medium text-sm">Frequently Asked Questions</span>
               <ChevronRight size={16} className="text-neutral-400" />
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 flex justify-between items-center">
               <span className="font-medium text-sm">Report a Bug</span>
               <ChevronRight size={16} className="text-neutral-400" />
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 flex justify-between items-center">
               <span className="font-medium text-sm">Submit Feedback</span>
               <ChevronRight size={16} className="text-neutral-400" />
            </div>
          </div>

          <div className="pt-4 border-t">
             <h4 className="font-semibold text-sm mb-1">Contact Us</h4>
             <p className="text-sm text-neutral-500">Email: support@carboniq.app</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
