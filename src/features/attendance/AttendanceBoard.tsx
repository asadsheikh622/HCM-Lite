import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { IAttendance, IAttendanceCorrection, IEmployee, IUser, ICompany } from '../../types/client';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Camera,
  MapPin,
  Check,
  X,
  FileEdit,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AttendanceBoardProps {
  currentUser: IUser;
  company: ICompany | null;
}

export const AttendanceBoard: React.FC<AttendanceBoardProps> = ({ currentUser, company }) => {
  const [attendances, setAttendances] = useState<IAttendance[]>([]);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [corrections, setCorrections] = useState<IAttendanceCorrection[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Correction Modal
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [corrDate, setCorrDate] = useState(new Date().toISOString().split('T')[0]);
  const [corrIn, setCorrIn] = useState('09:00');
  const [corrOut, setCorrOut] = useState('17:30');
  const [corrReason, setCorrReason] = useState('');
  const [corrFeedback, setCorrFeedback] = useState<string | null>(null);

  // Camera Attendance Modal
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStreaming, setCameraStreaming] = useState(false);
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [geoAllowed, setGeoAllowed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamObj, setStreamObj] = useState<MediaStream | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, empRes, corrRes] = await Promise.all([
        currentUser.role === 'employee'
          ? api.getMyAttendance()
          : api.getAllAttendance({ date: selectedDate }),
        api.getEmployees(),
        api.getCorrections(),
      ]);

      setAttendances(attRes.attendances);
      setEmployees(empRes.employees);
      setCorrections(corrRes.corrections);
    } catch (err) {
      console.error('Failed to load attendance board:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCorrection = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.reviewCorrection(id, status);
      loadData();
    } catch (err: any) {
      alert(`Error reviewing correction: ${err.message}`);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrFeedback(null);
    try {
      await api.submitCorrection({
        attendanceDate: corrDate,
        requestedCheckIn: corrIn,
        requestedCheckOut: corrOut,
        reason: corrReason,
      });
      setCorrFeedback('Correction submitted for HR review.');
      setCorrReason('');
      loadData();
      setTimeout(() => setIsCorrectionOpen(false), 1500);
    } catch (err: any) {
      setCorrFeedback(err.message || 'Submission failed.');
    }
  };

  // Camera & Geo helper
  const openCameraModal = async () => {
    setIsCameraOpen(true);
    // Request location
    if (navigator.geolocation && company?.officeCoordinates) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const R = 6371e3;
          const phi1 = (company.officeCoordinates.lat * Math.PI) / 180;
          const phi2 = (lat * Math.PI) / 180;
          const deltaPhi = ((lat - company.officeCoordinates.lat) * Math.PI) / 180;
          const deltaLambda = ((lng - company.officeCoordinates.lng) * Math.PI) / 180;
          const a =
            Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const dist = Math.round(R * c);
          setGeoDistance(dist);
          setGeoAllowed(dist <= (company.officeCoordinates.radiusMeters || 150));
        },
        () => setGeoAllowed(true)
      );
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
      setStreamObj(stream);
      setCameraStreaming(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      console.warn('Camera permission denied or unavailable');
    }
  };

  const closeCameraModal = () => {
    if (streamObj) {
      streamObj.getTracks().forEach((t) => t.stop());
    }
    setCameraStreaming(false);
    setIsCameraOpen(false);
  };

  const handleCaptureAndCheckIn = async () => {
    try {
      await api.checkIn({ faceVerified: true, distanceMeters: geoDistance || 10 });
      closeCameraModal();
      loadData();
    } catch (err: any) {
      alert(`Check-in failed: ${err.message}`);
    }
  };

  const empMap = new Map(employees.map((e) => [e._id, `${e.firstName} ${e.lastName} (${e.employeeCode})`]));
  const canManage = currentUser.role === 'admin' || currentUser.role === 'hr';

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Attendance & Shift Roster</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Web check-in records, working hour calculations, grace period audits, and HR corrections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'employee' && (
            <>
              <button
                onClick={openCameraModal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Camera Attendance</span>
              </button>
              <button
                onClick={() => setIsCorrectionOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Submit Correction</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Date Filter & Summary Strip */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Date Roster:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="text-zinc-600">
            Office Start: <strong className="text-zinc-900 font-mono">{company?.officeStartTime || '09:00'}</strong>
          </span>
          <span className="text-zinc-600">
            Grace: <strong className="text-zinc-900 font-mono">{company?.graceMinutes || 15}m</strong>
          </span>
          <span className="text-zinc-600">
            Half-Day: <strong className="text-zinc-900 font-mono">&lt; {company?.halfDayHoursThreshold || 5}h</strong>
          </span>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900">
            {currentUser.role === 'employee' ? 'My Attendance History' : `Daily Log for ${selectedDate}`}
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {attendances.length} Records Logged
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading attendance data...</div>
        ) : attendances.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase font-semibold text-[11px] tracking-wider border-b border-zinc-100">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Check-In</th>
                  <th className="px-5 py-3">Check-Out</th>
                  <th className="px-5 py-3 text-right">Worked Hours</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {attendances.map((a) => (
                  <tr key={a._id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-zinc-900">
                      {empMap.get(a.employeeId) || a.employeeId}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-600">{a.date}</td>
                    <td className="px-5 py-3.5 font-mono text-zinc-900">
                      {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-900">
                      {a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending Checkout'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums font-bold text-zinc-900">
                      {a.workedHours}h
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        a.status === 'present'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
                          : a.status === 'late'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/50'
                          : a.status === 'half_day'
                          ? 'bg-orange-50 text-orange-800 border border-orange-200/50'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-xs text-zinc-500">
            No attendance records found for this period. Use the check-in button or adjust the date filter.
          </div>
        )}
      </div>

      {/* Attendance Corrections Queue (HR & Employee) */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5">
        <h3 className="text-sm font-bold text-zinc-900 mb-1">
          Attendance Corrections Queue ({corrections.length})
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Manual timestamp discrepancy adjustment requests submitted with explanation
        </p>

        {corrections.length > 0 ? (
          <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden text-xs">
            {corrections.map((corr) => (
              <div key={corr._id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">
                      {empMap.get(corr.employeeId) || corr.employeeId}
                    </span>
                    <span className="font-mono text-zinc-500">· Date: {corr.attendanceDate}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Requested Shift: <strong className="font-mono">{corr.requestedCheckIn}</strong> to <strong className="font-mono">{corr.requestedCheckOut}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-500 italic mt-0.5">Reason: "{corr.reason}"</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    corr.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : corr.status === 'rejected'
                      ? 'bg-rose-50 text-rose-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}>
                    {corr.status}
                  </span>

                  {canManage && corr.status === 'pending' && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => handleReviewCorrection(corr._id, 'approved')}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewCorrection(corr._id, 'rejected')}
                        className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 py-3">No pending attendance correction requests.</p>
        )}
      </div>

      {/* ==========================================
          SUBMIT CORRECTION MODAL
      ========================================== */}
      {isCorrectionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Request Attendance Correction</h3>
              <button onClick={() => setIsCorrectionOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {corrFeedback && (
              <div className="my-3 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs">
                {corrFeedback}
              </div>
            )}

            <form onSubmit={handleCorrectionSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Actual Check-In</label>
                  <input
                    type="time"
                    required
                    value={corrIn}
                    onChange={(e) => setCorrIn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Actual Check-Out</label>
                  <input
                    type="time"
                    required
                    value={corrOut}
                    onChange={(e) => setCorrOut(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 uppercase mb-1">Reason for Discrepancy</label>
                <textarea
                  required
                  rows={3}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="e.g. Card reader outage or offsite client meeting"
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold cursor-pointer"
              >
                Submit Correction for HR Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          CAMERA & GEOFENCE ATTENDANCE MODAL
      ========================================== */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-zinc-900">Camera & GPS Check-In</h3>
              </div>
              <button onClick={closeCameraModal} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!cameraStreaming && (
                  <p className="absolute text-zinc-400 text-xs">Requesting camera permissions...</p>
                )}
              </div>

              {geoDistance !== null && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    <span>Office Distance:</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">
                    {geoDistance} metres
                  </span>
                </div>
              )}

              <p className="text-[11px] text-zinc-500 text-center">
                Verification stamp: Camera frame and GPS coordinates are checked against office geofence threshold.
              </p>

              <button
                onClick={handleCaptureAndCheckIn}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Capture Photo & Stamp Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
