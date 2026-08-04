import React, { useState } from 'react';
import { useAuthStore } from '@/store';
import { useOutpass } from '../hooks/useOutpass';
import { OutpassCard } from '../components/OutpassCard';
import { OutpassQRCard } from '../components/OutpassQRCard';
import { Card, Button, Input } from '@/components/ui';
import type { OutpassType, CreateOutpassDTO } from '../types/outpass';
import { Plus, Clock, CheckCircle2, FileText, Calendar, MapPin } from 'lucide-react';

export const StudentOutpassPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const studentReg = user?.registrationNumber || 'STU-2026-8901';
  const studentName = user?.fullName || 'Alex Rivera';
  const department = user?.department || 'CSE';
  const roomNumber = user?.roomNumber || '101';

  const { outpasses, activeApprovedOutpass, applyOutpass, loading } = useOutpass(studentReg);

  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateOutpassDTO>({
    type: 'LOCAL_OUTING',
    reason: '',
    destination: '',
    outDate: new Date().toISOString().split('T')[0],
    outTime: '17:00',
    expectedReturnDate: new Date().toISOString().split('T')[0],
    expectedReturnTime: '21:00',
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason || !formData.destination) return;

    await applyOutpass(studentName, department, roomNumber, formData);
    setShowApplyModal(false);
    setSuccessMessage('✓ Outpass request submitted successfully! Awaiting Warden approval.');
    setTimeout(() => setSuccessMessage(null), 5000);

    setFormData({
      type: 'LOCAL_OUTING',
      reason: '',
      destination: '',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '17:00',
      expectedReturnDate: new Date().toISOString().split('T')[0],
      expectedReturnTime: '21:00',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Notification Toast */}
      {successMessage && (
        <div className="bg-emerald-950 border border-emerald-500 text-emerald-200 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-2">
            <Clock className="w-3.5 h-3.5" />
            Hostel Gate Outpass Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Outpass & Leave Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Apply for digital gate passes and generate instant QR verification codes
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowApplyModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Apply New Outpass
        </Button>
      </div>

      {/* Grid: Active QR Card + Outpass History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active QR Section */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Active Gate Pass QR Code
          </h3>
          <OutpassQRCard outpass={activeApprovedOutpass} />
        </div>

        {/* History Section */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Outpass History ({outpasses.length})
          </h3>

          {outpasses.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 text-xs bg-slate-900/90 border-slate-800">
              No outpass applications submitted yet.
            </Card>
          ) : (
            <div className="space-y-4">
              {outpasses.map((item) => (
                <OutpassCard key={item.id} outpass={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Outpass Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Apply Outpass Request
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Outpass Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as OutpassType })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOCAL_OUTING">Local Outing (City)</option>
                  <option value="HOME_LEAVE">Home Leave (Weekend)</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                </select>
              </div>

              <Input
                label="Destination"
                placeholder="e.g. City Mall, Downtown"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                icon={<MapPin className="w-4 h-4" />}
                required
              />

              <Input
                label="Reason"
                placeholder="Reason for outing..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                icon={<FileText className="w-4 h-4" />}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Out Date"
                  type="date"
                  value={formData.outDate}
                  onChange={(e) => setFormData({ ...formData, outDate: e.target.value })}
                  icon={<Calendar className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Out Time"
                  type="time"
                  value={formData.outTime}
                  onChange={(e) => setFormData({ ...formData, outTime: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expected Return Date"
                  type="date"
                  value={formData.expectedReturnDate}
                  onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                  icon={<Calendar className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Expected Return Time"
                  type="time"
                  value={formData.expectedReturnTime}
                  onChange={(e) => setFormData({ ...formData, expectedReturnTime: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button type="button" variant="ghost" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={loading}>
                  Submit Application
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentOutpassPage;
