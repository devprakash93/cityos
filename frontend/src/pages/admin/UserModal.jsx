import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

const ROLES = ['CITIZEN', 'OFFICER', 'FIELD_WORKER'];

export default function UserModal({ user, onClose, onSuccess }) {
  const isEdit = !!user;
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    password: '',
    password_confirm: '',
    role_id: user?.role?.id || '',
    role_name: user?.role?.name || '',
    department_id: user?.department?.id || '',
    state_id: user?.profile?.state_ref || 1, // Default Odisha assuming ID 1
    district_id: user?.profile?.district_ref || '',
    city_id: user?.profile?.city_ref || '',
    zone_id: user?.profile?.zone_ref || '',
    ward_id: user?.profile?.ward_ref || '',
    is_active: user?.is_active ?? true,
  });

  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const selectedRole = roles.find(r => r.id.toString() === formData.role_id.toString())?.name || formData.role_name;

  // Initial Fetches
  useEffect(() => {
    api.get('/accounts/roles/').then(res => {
      const data = res.data.results || res.data;
      setRoles(data.filter(r => ROLES.includes(r.name)));
    });
    api.get('/departments/').then(res => setDepartments(res.data.results || res.data));
    api.get('/geography/states/').then(res => setStates(res.data.results || res.data));
  }, []);

  // Cascading Geography
  useEffect(() => {
    if (formData.state_id) {
      api.get(`/geography/districts/?state=${formData.state_id}`).then(res => setDistricts(res.data.results || res.data));
    } else {
      setDistricts([]);
    }
  }, [formData.state_id]);

  useEffect(() => {
    if (formData.district_id) {
      api.get(`/geography/cities/?district=${formData.district_id}`).then(res => setCities(res.data.results || res.data));
    } else {
      setCities([]);
    }
  }, [formData.district_id]);

  useEffect(() => {
    if (formData.city_id) {
      api.get(`/geography/zones/?city=${formData.city_id}`).then(res => setZones(res.data.results || res.data));
      // Also fetch wards directly for city if no zone selected
      api.get(`/geography/wards/?city=${formData.city_id}`).then(res => setWards(res.data.results || res.data));
    } else {
      setZones([]);
      setWards([]);
    }
  }, [formData.city_id]);

  useEffect(() => {
    if (formData.zone_id) {
      api.get(`/geography/wards/?zone=${formData.zone_id}`).then(res => setWards(res.data.results || res.data));
    } else if (formData.city_id) {
      api.get(`/geography/wards/?city=${formData.city_id}`).then(res => setWards(res.data.results || res.data));
    }
  }, [formData.zone_id, formData.city_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
       const val = type === 'checkbox' ? checked : value;
       const updates = { [name]: val };
       
       // Handle cascading resets
       if (name === 'state_id') {
           updates.district_id = ''; updates.city_id = ''; updates.zone_id = ''; updates.ward_id = '';
       } else if (name === 'district_id') {
           updates.city_id = ''; updates.zone_id = ''; updates.ward_id = '';
       } else if (name === 'city_id') {
           updates.zone_id = ''; updates.ward_id = '';
       } else if (name === 'zone_id') {
           updates.ward_id = '';
       } else if (name === 'first_name' || name === 'last_name') {
           // Auto-generate username from email or name
           if (!isEdit && !prev.username) {
              const base = (updates.first_name || prev.first_name || '').toLowerCase() + (updates.last_name || prev.last_name || '').toLowerCase();
              updates.username = base || Date.now().toString();
           }
       } else if (name === 'email') {
           if (!isEdit && !prev.username) {
              updates.username = value.split('@')[0];
           }
       }
       return { ...prev, ...updates };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isEdit) {
        // Prepare Edit Payload
        const payload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_active: formData.is_active,
          role_id: formData.role_id || null,
          department_id: formData.department_id || null,
          phone: formData.phone,
          state_ref: formData.state_id || null,
          district_ref: formData.district_id || null,
          city_ref: formData.city_id || null,
          zone_ref: formData.zone_id || null,
          ward_ref: formData.ward_id || null,
        };
        await api.patch(`/accounts/users/${user.id}/`, payload);
      } else {
        // Prepare Create Payload
        if (formData.password !== formData.password_confirm) {
           throw new Error("Passwords do not match.");
        }
        
        const payload = {
          email: formData.email,
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          role_id: formData.role_id,
          department_id: formData.department_id || null,
          phone: formData.phone,
          state_id: formData.state_id || null,
          district_id: formData.district_id || null,
          city_id: formData.city_id || null,
          zone_id: formData.zone_id || null,
          ward_id: formData.ward_id || null,
        };
        await api.post('/accounts/users/', payload);
      }
      
      onSuccess();
    } catch (err) {
      if (err.message === "Passwords do not match.") {
          setError(err.message);
      } else {
          const resData = err.response?.data;
          
          if (resData?.error) {
             const detail = resData.error.detail;
             if (typeof detail === 'object' && detail !== null) {
                const messages = Object.entries(detail).map(([key, val]) => {
                   return Array.isArray(val) ? `${key}: ${val[0]}` : `${key}: ${val}`;
                });
                setError(messages.join(' | '));
             } else {
                setError(resData.error.message || 'An unexpected error occurred.');
             }
          } else if (typeof resData === 'object') {
             const messages = Object.entries(resData).map(([key, val]) => {
                return Array.isArray(val) ? `${key}: ${val[0]}` : `${key}: ${val}`;
             });
             setError(messages.join(' | '));
          } else {
             setError('An unexpected error occurred.');
          }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit User' : 'Create User'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex gap-3 text-sm border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Basic Information</h3>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">First Name *</label>
                   <input required name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">Last Name</label>
                   <input name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                 </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">Email *</label>
                   <input required type="email" disabled={isEdit} name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">Phone</label>
                   <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                 </div>
               </div>

               {!isEdit && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700">Password *</label>
                     <input required type="password" minLength={8} name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                   </div>
                   <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700">Confirm Password *</label>
                     <input required type="password" minLength={8} name="password_confirm" value={formData.password_confirm} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                   </div>
                 </div>
               )}
            </div>

            <hr className="border-slate-100" />

            {/* Role & Department */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Assignment</h3>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">Role *</label>
                   <select required name="role_id" value={formData.role_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                     <option value="">Select Role...</option>
                     {roles.map(r => <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>)}
                   </select>
                 </div>
                 
                 {(selectedRole === 'OFFICER' || selectedRole === 'FIELD_WORKER') && (
                   <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-700">Department *</label>
                     <select required name="department_id" value={formData.department_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                       <option value="">Select Department...</option>
                       {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                     </select>
                   </div>
                 )}
               </div>
            </div>

            <hr className="border-slate-100" />

            {/* Geography */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Geography</h3>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">State</label>
                   <select name="state_id" value={formData.state_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                     <option value="">Select State...</option>
                     {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">District</label>
                   <select name="district_id" value={formData.district_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                     <option value="">Select District...</option>
                     {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                   </select>
                 </div>

                 <div className="space-y-1">
                   <label className="text-sm font-medium text-slate-700">City {(selectedRole === 'OFFICER' || selectedRole === 'FIELD_WORKER') ? '*' : ''}</label>
                   <select required={selectedRole === 'OFFICER' || selectedRole === 'FIELD_WORKER'} name="city_id" value={formData.city_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                     <option value="">Select City...</option>
                     {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
                 
                 {selectedRole === 'FIELD_WORKER' && (
                    <>
                     <div className="space-y-1">
                       <label className="text-sm font-medium text-slate-700">Zone *</label>
                       <select required name="zone_id" value={formData.zone_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                         <option value="">Select Zone...</option>
                         {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                       </select>
                     </div>
                     <div className="space-y-1">
                       <label className="text-sm font-medium text-slate-700">Ward *</label>
                       <select required name="ward_id" value={formData.ward_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                         <option value="">Select Ward...</option>
                         {wards.map(w => <option key={w.id} value={w.id}>Ward {w.number} {w.name && `(${w.name})`}</option>)}
                       </select>
                     </div>
                    </>
                 )}
                 {selectedRole !== 'FIELD_WORKER' && (
                    <div className="space-y-1">
                       <label className="text-sm font-medium text-slate-700">Ward</label>
                       <select name="ward_id" value={formData.ward_id} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white">
                         <option value="">Select Ward...</option>
                         {wards.map(w => <option key={w.id} value={w.id}>Ward {w.number} {w.name && `(${w.name})`}</option>)}
                       </select>
                     </div>
                 )}
               </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" form="user-form" disabled={loading} className="px-6 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50">
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
