// Reusable generic city service monitoring page
import { useState, useEffect } from 'react';
import { useCity } from '../../context/CityContext';
import api from '../../api/axios';
import { RefreshCw } from 'lucide-react';

export default function GenericServicePage({ title, icon: Icon, endpoint, color = 'bg-blue-500' }) {
  const { selectedCity } = useCity();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedCity ? { city_id: selectedCity.id } : {};
      const res = await api.get(endpoint, { params });
      const d = res.data.results ?? res.data ?? [];
      setData(Array.isArray(d) ? d : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedCity, endpoint]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{selectedCity?.name || 'All Odisha'} · Live monitoring</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="text-sm text-slate-500">
          {loading ? 'Loading...' : `${data.length} records loaded for ${selectedCity?.name || 'All Odisha'}.`}
        </p>
        {!loading && data.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {Object.keys(data[0]).slice(0, 6).map(key => (
                    <th key={key} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{key.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.slice(0, 15).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {Object.values(row).slice(0, 6).map((val, j) => (
                      <td key={j} className="px-4 py-2 text-slate-600 text-xs">
                        {val === null || val === undefined ? '—' :
                         typeof val === 'boolean' ? (val ? 'Yes' : 'No') :
                         typeof val === 'object' ? JSON.stringify(val).slice(0, 40) :
                         String(val).slice(0, 60)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
