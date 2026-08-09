import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import api from '../../api/axios';

export default function OfficerReports() {
  const [days, setDays] = useState(30);
  const [downloading, setDownloading] = useState(false);

  const downloadReport = (format) => {
    setDownloading(true);
    const token = localStorage.getItem('token');
    const baseURL = api.defaults.baseURL || 'http://127.0.0.1:8000/api';
    const url = `${baseURL}/analytics/reports/download/?format=${format}&days=${days}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if(!res.ok) throw new Error("Failed to generate report");
      return res.blob();
    })
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `department_report_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch(err => {
      console.error(err);
      alert('Error downloading report.');
    })
    .finally(() => {
      setDownloading(false);
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Department Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Generate performance reports for your department</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>System Performance Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            
            <div className="flex-1 p-6 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center space-y-4">
              <FileText className="w-12 h-12 text-rose-500" />
              <div>
                <h3 className="text-lg font-medium text-slate-900">Executive PDF Summary</h3>
                <p className="text-sm text-slate-500 mt-1">High-level KPIs and resolution rates for your department.</p>
              </div>
              <Button onClick={() => downloadReport('pdf')} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700" isLoading={downloading}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>

            <div className="flex-1 p-6 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center space-y-4">
              <FileSpreadsheet className="w-12 h-12 text-emerald-500" />
              <div>
                <h3 className="text-lg font-medium text-slate-900">Detailed Excel Export</h3>
                <p className="text-sm text-slate-500 mt-1">Row-by-row data dump of all department complaints.</p>
              </div>
              <Button onClick={() => downloadReport('xlsx')} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700" isLoading={downloading}>
                <Download className="w-4 h-4 mr-2" /> Download XLSX
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
