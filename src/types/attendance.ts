export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  phone: string;
  class: string;
  section: string;
  faceData?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: Date;
  checkInTime: Date;
  checkOutTime?: Date;
  status: 'present' | 'absent' | 'late';
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    onCampus: boolean;
  };
  verificationMethod: 'face' | 'manual' | 'override';
  fraudAttempts?: FraudLog[];
}

export interface FraudLog {
  id: string;
  studentId: string;
  timestamp: Date;
  type: 'photo' | 'screen' | 'video' | 'deepfake' | 'multiple_faces';
  confidence: number;
  deviceInfo: string;
  ipAddress: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface Geofence {
  id: string;
  name: string;
  type: 'polygon' | 'radius';
  coordinates: Array<{ lat: number; lng: number }>;
  center?: { lat: number; lng: number };
  radius?: number;
  active: boolean;
}

export interface AdminSettings {
  geofences: Geofence[];
  attendanceWindow: {
    startTime: string;
    endTime: string;
    allowLateEntry: boolean;
    lateThresholdMinutes: number;
  };
  fraudDetection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    blockOnDetection: boolean;
  };
}