import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { 
  MapPin, Clock, Info, CheckCircle2, Navigation, PlayCircle, 
  Camera, UploadCloud, AlertCircle
} from 'lucide-react';

export default function WorkerTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [completionNotes, setCompletionNotes] = useState('');
  const [file, setFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTask = async () => {
    try {
      const response = await api.get(`/complaints/worker/tasks/${id}/`);
      setTask(response.data);
    } catch (error) {
      console.error("Error fetching task details:", error);
      alert("Failed to load task.");
      navigate('/worker/tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const handleAction = async (actionPath) => {
    setActionLoading(true);
    try {
      await api.post(`/complaints/worker/tasks/${id}/${actionPath}/`, { remarks: 'Action performed via mobile app' });
      await fetchTask();
    } catch (error) {
      console.error(`Error performing ${actionPath}:`, error);
      alert(error.response?.data?.message || 'Failed to update task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!completionNotes) {
      alert("Please provide completion notes.");
      return;
    }
    setActionLoading(true);
    try {
      // 1. Upload photo if exists
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('media_type', 'COMPLETION');
        formData.append('caption', completionNotes);
        await api.post(`/complaints/${id}/media/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      // 2. Mark complete
      await api.post(`/complaints/worker/tasks/${id}/complete/`, { remarks: completionNotes });
      alert("Task submitted for officer verification!");
      await fetchTask();
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Failed to complete task.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading task data...</div>;
  if (!task) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start mb-2">
           <h1 className="text-2xl font-bold text-slate-900 leading-tight">#{task.reference_number} - {task.title}</h1>
           <div className="flex gap-2">
              <StatusBadge status={task.status === 'ON_SITE' ? 'ON_THE_WAY' : (task.status === 'IN_PROGRESS' ? 'WORKING' : task.status)} />
           </div>
        </div>
        <p className="text-sm text-slate-500">Assigned by {task.active_assignment?.assigned_by?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
           <Card>
             <CardHeader>
               <CardTitle className="text-lg flex items-center gap-2"><Info className="w-5 h-5 text-amber-500"/> Task Details</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="bg-slate-50 p-4 rounded-lg text-slate-700 text-sm whitespace-pre-wrap">
                 {task.description}
               </div>
               
               {task.active_assignment?.remarks && (
                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-lg">
                     <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Officer Instructions</h4>
                     <p className="text-sm text-amber-900">{task.active_assignment.remarks}</p>
                  </div>
               )}
             </CardContent>
           </Card>

           {/* Completion Form (Only visible if IN_PROGRESS) */}
           {task.status === 'IN_PROGRESS' && (
             <Card className="border-emerald-200">
               <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
                 <CardTitle className="text-emerald-800 flex items-center gap-2">
                   <CheckCircle2 className="w-5 h-5"/> Complete Task
                 </CardTitle>
               </CardHeader>
               <CardContent className="pt-4">
                 <form onSubmit={handleComplete} className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Completion Notes <span className="text-red-500">*</span></label>
                     <textarea
                       required
                       rows={3}
                       placeholder="Describe exactly what was fixed..."
                       className="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-3 border"
                       value={completionNotes}
                       onChange={e => setCompletionNotes(e.target.value)}
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Upload Photo Proof (Optional)</label>
                     <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors relative">
                       <div className="space-y-1 text-center">
                         <Camera className="mx-auto h-8 w-8 text-slate-400" />
                         <div className="flex text-sm text-slate-600 justify-center">
                           <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                             <span>{file ? file.name : "Upload a photo"}</span>
                             <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={e => setFile(e.target.files[0])} />
                           </label>
                         </div>
                       </div>
                     </div>
                   </div>

                   <Button type="submit" isLoading={actionLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Submit Completion Proof
                   </Button>
                 </form>
               </CardContent>
             </Card>
           )}
           
           {/* If task is completed and awaiting review */}
           {task.status === 'REVIEW' && (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
                 <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                 <h3 className="text-lg font-bold text-blue-900">Awaiting Verification</h3>
                 <p className="text-blue-700 mt-1">You have completed this task. It is currently being reviewed by the officer.</p>
              </div>
           )}

           {/* Activity Timeline */}
           {task.history?.length > 0 && (
             <Card>
                <CardHeader>
                   <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="relative border-l border-slate-200 ml-3 space-y-6">
                      {task.history.map(item => (
                         <div key={item.id} className="relative pl-6">
                            <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></span>
                            <div className="text-sm font-medium text-slate-900">{item.event_type.replace('_', ' ')}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{new Date(item.timestamp).toLocaleString()} by {item.changed_by?.full_name}</div>
                            {item.remarks && <div className="text-sm text-slate-600 mt-1 bg-slate-50 p-2 rounded">{item.remarks}</div>}
                         </div>
                      ))}
                   </div>
                </CardContent>
             </Card>
           )}
        </div>

        <div className="space-y-6">
           {/* Actions Card */}
           {['ASSIGNED', 'ACCEPTED', 'ON_SITE'].includes(task.status) && (
              <Card className="border-amber-200 shadow-md">
                 <CardHeader className="bg-amber-50 border-b border-amber-100">
                    <CardTitle className="text-base text-amber-900">Task Actions</CardTitle>
                 </CardHeader>
                 <CardContent className="p-4 space-y-3">
                    {task.status === 'ASSIGNED' && (
                       <Button 
                          onClick={() => handleAction('accept')} 
                          isLoading={actionLoading}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-lg font-bold"
                       >
                          <CheckCircle2 className="w-5 h-5 mr-2" /> ACCEPT TASK
                       </Button>
                    )}
                    {task.status === 'ACCEPTED' && (
                       <Button 
                          onClick={() => handleAction('start-travel')} 
                          isLoading={actionLoading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-bold"
                       >
                          <Navigation className="w-5 h-5 mr-2" /> START TRAVEL
                       </Button>
                    )}
                    {task.status === 'ON_SITE' && (
                       <Button 
                          onClick={() => handleAction('start-work')} 
                          isLoading={actionLoading}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-lg font-bold"
                       >
                          <PlayCircle className="w-5 h-5 mr-2" /> START WORK
                       </Button>
                    )}
                 </CardContent>
              </Card>
           )}

           <Card>
             <CardContent className="p-5 space-y-4">
                <div>
                   <span className="block text-xs font-bold text-slate-500 uppercase">Priority</span>
                   <StatusBadge status={task.priority} className="mt-1" />
                </div>
                <div>
                   <span className="block text-xs font-bold text-slate-500 uppercase">Deadline</span>
                   <div className="flex items-center gap-2 mt-1 font-medium text-slate-900">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {task.active_assignment?.deadline ? new Date(task.active_assignment.deadline).toLocaleString() : 'No deadline'}
                   </div>
                </div>
                <div>
                   <span className="block text-xs font-bold text-slate-500 uppercase">Location</span>
                   <div className="flex items-start gap-2 mt-1 text-sm font-medium text-slate-900">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      {task.address || 'Location not specified'}
                   </div>
                   {task.location_lat && task.location_lng && (
                      <Button variant="outline" className="w-full mt-3 text-xs" onClick={() => window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=current%3B${task.location_lat}%2C${task.location_lng}`, '_blank')}>
                         Get Directions (OSM)
                      </Button>
                   )}
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
