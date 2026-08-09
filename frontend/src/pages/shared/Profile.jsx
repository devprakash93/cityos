import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../api/axios';

export default function Profile() {
  const { user, login } = useAuth(); // We can re-fetch user info by triggering AuthContext fetch if needed, but let's just use local state for the form
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    bio: '',
    availability: 'AVAILABLE'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.profile?.phone || '',
        address: user.profile?.address || '',
        bio: user.profile?.bio || '',
        availability: user.profile?.availability || 'AVAILABLE'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // The backend expects first_name, last_name, and nested profile object
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        profile: {
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio,
          availability: formData.availability
        }
      };
      await api.put('/auth/me/', payload);
      alert('Profile updated successfully!');
      // Ideally we refresh the auth context user here, but forcing a reload or relying on next navigation works for now.
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Error updating profile. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-bold mb-4">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-bold text-lg text-slate-900">{user.full_name || user.username}</h3>
            <p className="text-slate-500 text-sm mb-2">{user.email}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              {user.role?.name || 'User'}
            </span>
            {user.department && (
              <p className="text-xs text-slate-400 mt-4 border-t pt-4 w-full">
                Dept: {user.department.name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Edit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                />
                <Input
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
              <Input
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                />
              </div>
              
              {user.role?.name === 'FIELD_WORKER' && (
                 <div className="space-y-1">
                   <label className="block text-sm font-medium text-slate-700">Operational Availability</label>
                   <select
                     name="availability"
                     value={formData.availability}
                     onChange={handleChange}
                     className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                   >
                     <option value="AVAILABLE">Available for Tasks</option>
                     <option value="BUSY">Busy</option>
                     <option value="ON_TASK">Currently On Task</option>
                     <option value="OFFLINE">Offline / Off Duty</option>
                     <option value="ON_LEAVE">On Leave</option>
                   </select>
                 </div>
              )}

              <div className="pt-4 flex justify-end">
                <Button type="submit" isLoading={loading}>Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
