import { Card, CardContent } from '../components/ui/Card';
import { Construction } from 'lucide-react';

export default function ComingSoon() {
  return (
    <div className="flex items-center justify-center h-[70vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary-50 rounded-full">
              <Construction className="w-12 h-12 text-primary-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Coming Soon</h2>
          <p className="text-slate-500">
            This module is currently under construction. Please check back later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
