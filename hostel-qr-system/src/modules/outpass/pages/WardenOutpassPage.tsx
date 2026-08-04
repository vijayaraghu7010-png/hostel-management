import React, { useState, useMemo } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { UniversalScanner } from '@/components/scanner/UniversalScanner';
import type { ParsedScanResult } from '@/types/scanner';
import { useApproval } from '../hooks/useApproval';
import { OutpassCard } from '../components/OutpassCard';
import type { OutpassStatusType } from '../types/outpass';
import { Camera, Search, CheckCircle2, AlertCircle, X, Shield, Clock } from 'lucide-react';

export const WardenOutpassPage: React.FC = () => {
  const { allRequests, approve, reject, verifyScanResult, loading } = useApproval();

  const [activeTab, setActiveTab] = useState<OutpassStatusType | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const filteredRequests = useMemo(() => {
    return allRequests.filter((item) => {
      const matchesTab = activeTab === 'ALL' || item.status === activeTab;
      const matchesSearch =
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentReg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [allRequests, activeTab, searchTerm]);

  const handleScanResult = async (scanResult: ParsedScanResult) => {
    const res = await verifyScanResult(scanResult);
    if (res.isValid) {
      triggerToast(res.message, 'success');
    } else {
      triggerToast(`❌ ${res.message}`, 'error');
    }
  };

  const pendingCount = allRequests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = allRequests.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl border shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : 'bg-rose-950 border-rose-500 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
            <Shield className="w-3.5 h-3.5" />
            Warden Gate Control Mode
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Outpass Approval & Verification
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review student leave requests and verify hostel exit/entry gate passes
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowScanner(true)}
          className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
        >
          <Camera className="w-4 h-4 mr-2" />
          Scan Gate Pass QR
        </Button>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab}
                {tab === 'PENDING' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px]">
                    {pendingCount}
                  </span>
                )}
                {tab === 'APPROVED' && approvedCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px]">
                    {approvedCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-64">
            <Input
              placeholder="Search student or Outpass ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-3.5 h-3.5" />}
              className="text-xs py-1.5"
            />
          </div>
        </div>
      </Card>

      {/* Outpass Cards Grid */}
      {filteredRequests.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-xs bg-slate-900/90 border-slate-800">
          No outpass requests found for status "{activeTab}".
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((item) => (
            <OutpassCard
              key={item.id}
              outpass={item}
              isWarden={true}
              onApprove={(id) => void approve(id)}
              onReject={(id, reason) => void reject(id, reason)}
              isLoading={loading}
            />
          ))}
        </div>
      )}

      {/* Universal Gate Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Gate Exit & Re-entry QR Scanner
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <UniversalScanner
              onScanResult={(res) => void handleScanResult(res)}
              onClose={() => setShowScanner(false)}
              title="Hostel Gate Outpass Scanner"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WardenOutpassPage;
