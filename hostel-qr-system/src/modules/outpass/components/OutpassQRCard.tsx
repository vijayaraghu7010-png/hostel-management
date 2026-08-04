import React from 'react';
import { DigitalWalletQR } from '@/components/qr/DigitalWalletQR';
import { OutpassStatus } from './OutpassStatus';
import { Card } from '@/components/ui';
import type { OutpassRequest } from '../types/outpass';
import { ShieldCheck, MapPin, Calendar } from 'lucide-react';

export interface OutpassQRCardProps {
  outpass: OutpassRequest | null;
}

export const OutpassQRCard: React.FC<OutpassQRCardProps> = ({ outpass }) => {
  if (!outpass || outpass.status !== 'APPROVED') {
    return (
      <Card className="w-full max-w-sm mx-auto p-8 text-center space-y-3 bg-slate-900/90 border-slate-800">
        <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-200">No Active Approved Gate Pass</h3>
        <p className="text-xs text-slate-400">
          Apply for an Outpass and await Warden approval to generate your entry/exit QR barcode.
        </p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {/* Pass Status Card Header */}
      <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">Approved Hostel Gate Pass</span>
          <OutpassStatus status={outpass.status} />
        </div>

        <div className="text-xs space-y-1 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Destination: <strong>{outpass.destination}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Valid Until: {outpass.expectedReturnDate} @ {outpass.expectedReturnTime}</span>
          </div>
        </div>
      </Card>

      {/* Digital Wallet Style Approved Gate Pass */}
      <DigitalWalletQR
        type="OUTPASS"
        id={outpass.id}
        studentName={outpass.studentName}
        registrationNumber={outpass.studentReg}
        department={outpass.department}
        roomNumber={outpass.roomNumber}
        destination={outpass.destination}
        payloadData={{
          outpassId: outpass.id,
          studentReg: outpass.studentReg,
          studentName: outpass.studentName,
          destination: outpass.destination,
          outDate: outpass.outDate,
          outTime: outpass.outTime,
          expectedReturnDate: outpass.expectedReturnDate,
          expectedReturnTime: outpass.expectedReturnTime,
          timestamp: Date.now(),
        }}
        title={`Gate Pass #${outpass.id}`}
      />
    </div>
  );
};
