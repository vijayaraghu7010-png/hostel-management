import React from 'react';
import { UniversalQR } from './UniversalQR';
import type { QRType } from '@/types/qr';

export interface DigitalWalletQRProps {
  type: QRType;
  id: string;
  studentName: string;
  department: string;
  roomNumber: string;
  registrationNumber: string;
  destination?: string;
  payloadData?: Record<string, unknown>;
  title?: string;
}

export const DigitalWalletQR: React.FC<DigitalWalletQRProps> = ({
  type,
  id,
  studentName,
  department,
  roomNumber,
  registrationNumber,
  destination,
  payloadData = {},
  title = 'Hostel Digital Pass',
}) => {
  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Wallet Pass Top Header Badge */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 border-t border-x border-blue-500/30 rounded-t-3xl p-5 shadow-2xl relative overflow-hidden">
        {/* Glowing Background Glow Orbs */}
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-extrabold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            KVCET Digital Wallet Pass
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {type}
          </span>
        </div>

        <h3 className="text-lg font-black text-slate-100 mt-2 tracking-tight">{title}</h3>
      </div>

      {/* Student Card Info Block */}
      <div className="bg-slate-900 border-x border-slate-800 p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Student Name
            </span>
            <span className="font-bold text-slate-100 text-sm">{studentName}</span>
          </div>

          <div className="text-right">
            <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Reg Number
            </span>
            <span className="font-mono font-bold text-blue-400">{registrationNumber}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800/80">
          <div>
            <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Department
            </span>
            <span className="font-semibold text-slate-300">{department}</span>
          </div>

          <div className="text-right">
            <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Room Number
            </span>
            <span className="font-semibold text-slate-300">Room {roomNumber}</span>
          </div>
        </div>

        {destination && (
          <div className="pt-2 border-t border-slate-800/80 text-xs">
            <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Destination
            </span>
            <span className="font-bold text-emerald-400">{destination}</span>
          </div>
        )}
      </div>

      {/* Embedded High-Res Universal QR Generator with 30s Countdown */}
      <div className="bg-slate-900 border-b border-x border-slate-800 rounded-b-3xl pb-5">
        <UniversalQR
          type={type}
          id={id}
          payloadData={{
            ...payloadData,
            studentReg: registrationNumber,
            studentName,
            department,
            roomNumber,
          }}
          ttlSeconds={30}
          autoRefresh={true}
        />
      </div>
    </div>
  );
};
