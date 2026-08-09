import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import api from '../../api/axios';

export default function Reports() {
  const [days, setDays] = useState(30);

  const downloadReport = (format) => {
    // We use a direct window open or anchor click for downloads
    const token = localStorage.getItem('token');
    const baseURL = api.defaults.baseURL || 'http://127.0.0.1:8000/api';
    const url = `${baseURL}/analytics/reports/download/?format=${format}&days=${days}`;
    
    // Create an invisible anchor to download with the token in query (or just rely on session cookie if available)
    // Note: If using JWT, downloading files via GET needs the token. A common workaround is passing it via query param.
    // Or doing a fetch() and creating a blob object URL. Let's do the blob approach for security.
    
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
      a.download = `report_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    })
    .catch(err => {
      console.error(err);
      alert('Error downloading report.');
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Global Analytics & Reports</h1>
      
      <Card className="glass-dark border-slate-700">
        <CardHeader>
          <CardTitle>System Performance Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            
            <div className="flex-1 p-6 border border-slate-700 rounded-lg bg-slate-800/50 flex flex-col items-center justify-center text-center space-y-4">
              <FileText className="w-12 h-12 text-rose-400" />
              <div>
                <h3 className="text-lg font-medium text-white">Executive PDF Summary</h3>
                <p className="text-sm text-slate-400 mt-1">High-level KPIs, resolution rates, and department performance breakdown.</p>
              </div>
              <Button onClick={() => downloadReport('pdf')} className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>

            <div className="flex-1 p-6 border border-slate-700 rounded-lg bg-slate-800/50 flex flex-col items-center justify-center text-center space-y-4">
              <FileSpreadsheet className="w-12 h-12 text-emerald-400" />
              <div>
                <h3 className="text-lg font-medium text-white">Detailed Excel Export</h3>
                <p className="text-sm text-slate-400 mt-1">Row-by-row data dump of all complaints, suitable for custom pivoting.</p>
              </div>
              <Button onClick={() => downloadReport('xlsx')} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
                <Download className="w-4 h-4 mr-2" /> Download XLSX
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
