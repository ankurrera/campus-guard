import { AntiSpoofingResult } from './faceAntiSpoofing';
import { LocationVerificationResult } from './locationSecurity';

export interface FraudAttempt {
  id: string;
  studentId: string;
  timestamp: Date;
  type: 'face_spoofing' | 'location_spoofing' | 'multiple_attempts' | 'device_mismatch' | 'vpn_usage' | 'impossible_speed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  details: {
    userAgent: string;
    ipAddress?: string;
    location?: {
      gps: { lat: number; lng: number; accuracy: number };
      ip?: { lat: number; lng: number };
      discrepancy?: number;
    };
    faceAnalysis?: AntiSpoofingResult;
    locationAnalysis?: LocationVerificationResult;
    deviceFingerprint: string;
    sessionInfo: {
      attemptCount: number;
      lastAttempt: Date;
      successfulAttempts: number;
    };
  };
  blocked: boolean;
  resolved: boolean;
  notes?: string;
}

export interface FraudPattern {
  type: string;
  description: string;
  indicators: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  autoBlock: boolean;
}

export interface AttendanceAttempt {
  studentId: string;
  timestamp: Date;
  deviceFingerprint: string;
  ipAddress?: string;
  location: { lat: number; lng: number; accuracy: number };
  faceResult?: AntiSpoofingResult;
  locationResult?: LocationVerificationResult;
  success: boolean;
  blocked: boolean;
  fraudScore: number;
}

/**
 * Enhanced fraud detection system with pattern recognition
 */
export class FraudDetectionEngine {
  private static attendanceAttempts: Map<string, AttendanceAttempt[]> = new Map();
  private static fraudAttempts: FraudAttempt[] = [];
  private static blockedDevices: Set<string> = new Set();
  private static blockedIPs: Set<string> = new Set();
  
  // Fraud patterns to detect
  private static fraudPatterns: FraudPattern[] = [
    {
      type: 'face_spoofing',
      description: 'Face spoofing detected through depth/texture analysis',
      indicators: ['low_depth_score', 'low_texture_score', 'no_motion', 'screen_reflection'],
      riskLevel: 'high',
      autoBlock: true
    },
    {
      type: 'location_spoofing',
      description: 'GPS location does not match IP-based location',
      indicators: ['large_distance_discrepancy', 'vpn_detected', 'impossible_speed'],
      riskLevel: 'high',
      autoBlock: true
    },
    {
      type: 'repeated_failures',
      description: 'Multiple failed authentication attempts',
      indicators: ['multiple_face_failures', 'multiple_location_failures'],
      riskLevel: 'medium',
      autoBlock: false
    },
    {
      type: 'device_switching',
      description: 'Rapid switching between different devices',
      indicators: ['different_fingerprints', 'different_user_agents'],
      riskLevel: 'medium',
      autoBlock: false
    },
    {
      type: 'vpn_usage',
      description: 'VPN or proxy usage detected',
      indicators: ['vpn_detected', 'proxy_detected', 'tor_detected'],
      riskLevel: 'medium',
      autoBlock: true
    }
  ];
  
  /**
   * Analyze attendance attempt for fraud indicators
   */
  static analyzeAttendanceAttempt(
    studentId: string,
    faceResult: AntiSpoofingResult,
    locationResult: LocationVerificationResult,
    deviceFingerprint: string,
    ipAddress?: string
  ): {
    fraudScore: number;
    shouldBlock: boolean;
    fraudIndicators: string[];
    fraudAttempt?: FraudAttempt;
  } {
    
    const attempt: AttendanceAttempt = {
      studentId,
      timestamp: new Date(),
      deviceFingerprint,
      ipAddress,
      location: locationResult.gpsLocation,
      faceResult,
      locationResult,
      success: faceResult.isLive && locationResult.isValid,
      blocked: false,
      fraudScore: 0
    };
    
    // Get student's attempt history
    const studentAttempts = this.attendanceAttempts.get(studentId) || [];
    studentAttempts.push(attempt);
    this.attendanceAttempts.set(studentId, studentAttempts);
    
    // Keep only last 50 attempts per student
    if (studentAttempts.length > 50) {
      studentAttempts.splice(0, studentAttempts.length - 50);
    }
    
    let fraudScore = 0;
    const fraudIndicators: string[] = [];
    
    // Face spoofing analysis
    if (!faceResult.isLive) {
      fraudScore += 0.4;
      fraudIndicators.push(`face_spoofing_${faceResult.spoofingType || 'unknown'}`);
      
      if (faceResult.details.depthAnalysis < 0.3) {
        fraudIndicators.push('low_depth_score');
        fraudScore += 0.1;
      }
      
      if (faceResult.details.textureAnalysis < 0.3) {
        fraudIndicators.push('low_texture_score');
        fraudScore += 0.1;
      }
      
      if (faceResult.details.motionAnalysis < 0.3) {
        fraudIndicators.push('no_motion');
        fraudScore += 0.1;
      }
    }
    
    // Location spoofing analysis
    if (!locationResult.isValid) {
      fraudScore += 0.3;
      
      if (locationResult.fraudIndicators.vpnDetected) {
        fraudIndicators.push('vpn_detected');
        fraudScore += 0.2;
      }
      
      if (locationResult.fraudIndicators.locationSpoofing) {
        fraudIndicators.push('location_spoofing');
        fraudScore += 0.3;
      }
      
      if (locationResult.fraudIndicators.impossibleSpeed) {
        fraudIndicators.push('impossible_speed');
        fraudScore += 0.2;
      }
      
      if (locationResult.fraudIndicators.proxyDetected) {
        fraudIndicators.push('proxy_detected');
        fraudScore += 0.15;
      }
    }
    
    // Pattern analysis
    const patternAnalysis = this.analyzePatterns(studentId, studentAttempts);
    fraudScore += patternAnalysis.fraudScore;
    fraudIndicators.push(...patternAnalysis.indicators);
    
    // Device and IP blocking checks
    if (this.blockedDevices.has(deviceFingerprint)) {
      fraudScore += 0.5;
      fraudIndicators.push('blocked_device');
    }
    
    if (ipAddress && this.blockedIPs.has(ipAddress)) {
      fraudScore += 0.4;
      fraudIndicators.push('blocked_ip');
    }
    
    // Rate limiting check
    const recentAttempts = this.getRecentAttempts(studentId, 5); // Last 5 minutes
    if (recentAttempts.length > 10) {
      fraudScore += 0.3;
      fraudIndicators.push('rate_limit_exceeded');
    }
    
    attempt.fraudScore = fraudScore;
    
    // Determine if should block
    const shouldBlock = fraudScore >= 0.6 || this.shouldAutoBlock(fraudIndicators);
    attempt.blocked = shouldBlock;
    
    // Create fraud attempt record if significant fraud detected
    let fraudAttempt: FraudAttempt | undefined;
    if (fraudScore >= 0.4) {
      fraudAttempt = this.createFraudAttempt(
        studentId,
        faceResult,
        locationResult,
        deviceFingerprint,
        fraudIndicators,
        fraudScore,
        ipAddress
      );
      
      this.fraudAttempts.push(fraudAttempt);
      
      // Auto-block if necessary
      if (shouldBlock) {
        this.blockDevice(deviceFingerprint);
        if (ipAddress) {
          this.blockIP(ipAddress);
        }
      }
    }
    
    return {
      fraudScore,
      shouldBlock,
      fraudIndicators,
      fraudAttempt
    };
  }
  
  /**
   * Analyze patterns in student's attempt history
   */
  private static analyzePatterns(studentId: string, attempts: AttendanceAttempt[]): {
    fraudScore: number;
    indicators: string[];
  } {
    let fraudScore = 0;
    const indicators: string[] = [];
    
    if (attempts.length < 2) {
      return { fraudScore, indicators };
    }
    
    const recentAttempts = attempts.slice(-10); // Last 10 attempts
    
    // Multiple failure pattern
    const failureCount = recentAttempts.filter(a => !a.success).length;
    if (failureCount >= 5) {
      fraudScore += 0.2;
      indicators.push('multiple_failures');
    }
    
    // Device switching pattern
    const uniqueDevices = new Set(recentAttempts.map(a => a.deviceFingerprint));
    if (uniqueDevices.size > 3) {
      fraudScore += 0.15;
      indicators.push('device_switching');
    }
    
    // Location jumping pattern
    const locations = recentAttempts.map(a => a.location);
    for (let i = 1; i < locations.length; i++) {
      const distance = this.calculateDistance(
        locations[i-1].lat, locations[i-1].lng,
        locations[i].lat, locations[i].lng
      );
      
      const timeDiff = (recentAttempts[i].timestamp.getTime() - recentAttempts[i-1].timestamp.getTime()) / 1000;
      const speed = distance / timeDiff * 3.6; // km/h
      
      if (speed > 200) { // Impossible speed
        fraudScore += 0.25;
        indicators.push('location_jumping');
        break;
      }
    }
    
    // Time pattern analysis (checking at unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) { // Outside normal attendance hours
      const nightAttempts = recentAttempts.filter(a => {
        const h = a.timestamp.getHours();
        return h < 6 || h > 22;
      });
      
      if (nightAttempts.length >= 3) {
        fraudScore += 0.1;
        indicators.push('unusual_time_pattern');
      }
    }
    
    return { fraudScore, indicators };
  }
  
  /**
   * Check if fraud indicators warrant auto-blocking
   */
  private static shouldAutoBlock(indicators: string[]): boolean {
    const autoBlockPatterns = this.fraudPatterns
      .filter(p => p.autoBlock)
      .flatMap(p => p.indicators);
    
    return indicators.some(indicator => autoBlockPatterns.includes(indicator));
  }
  
  /**
   * Create fraud attempt record
   */
  private static createFraudAttempt(
    studentId: string,
    faceResult: AntiSpoofingResult,
    locationResult: LocationVerificationResult,
    deviceFingerprint: string,
    fraudIndicators: string[],
    fraudScore: number,
    ipAddress?: string
  ): FraudAttempt {
    
    // Determine severity based on fraud score and indicators
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (fraudScore >= 0.8) severity = 'critical';
    else if (fraudScore >= 0.6) severity = 'high';
    else if (fraudScore >= 0.4) severity = 'medium';
    
    // Determine fraud type
    let type: FraudAttempt['type'] = 'multiple_attempts';
    if (fraudIndicators.some(i => i.includes('face_spoofing'))) {
      type = 'face_spoofing';
    } else if (fraudIndicators.some(i => i.includes('location_spoofing'))) {
      type = 'location_spoofing';
    } else if (fraudIndicators.includes('vpn_detected')) {
      type = 'vpn_usage';
    } else if (fraudIndicators.includes('device_switching')) {
      type = 'device_mismatch';
    } else if (fraudIndicators.includes('impossible_speed')) {
      type = 'impossible_speed';
    }
    
    const studentAttempts = this.attendanceAttempts.get(studentId) || [];
    const recentAttempts = studentAttempts.slice(-10);
    const successfulAttempts = recentAttempts.filter(a => a.success).length;
    
    return {
      id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId,
      timestamp: new Date(),
      type,
      severity,
      confidence: fraudScore,
      details: {
        userAgent: navigator.userAgent,
        ipAddress,
        location: {
          gps: locationResult.gpsLocation,
          ip: locationResult.ipLocation,
          discrepancy: locationResult.distanceDiscrepancy
        },
        faceAnalysis: faceResult,
        locationAnalysis: locationResult,
        deviceFingerprint,
        sessionInfo: {
          attemptCount: recentAttempts.length,
          lastAttempt: recentAttempts[recentAttempts.length - 1]?.timestamp || new Date(),
          successfulAttempts
        }
      },
      blocked: fraudScore >= 0.6,
      resolved: false
    };
  }
  
  /**
   * Get recent attempts for a student
   */
  private static getRecentAttempts(studentId: string, minutes: number): AttendanceAttempt[] {
    const attempts = this.attendanceAttempts.get(studentId) || [];
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    return attempts.filter(attempt => attempt.timestamp >= cutoff);
  }
  
  /**
   * Calculate distance between two coordinates
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
  
  /**
   * Block a device fingerprint
   */
  static blockDevice(fingerprint: string): void {
    this.blockedDevices.add(fingerprint);
  }
  
  /**
   * Block an IP address
   */
  static blockIP(ipAddress: string): void {
    this.blockedIPs.add(ipAddress);
  }
  
  /**
   * Unblock a device fingerprint
   */
  static unblockDevice(fingerprint: string): void {
    this.blockedDevices.delete(fingerprint);
  }
  
  /**
   * Unblock an IP address
   */
  static unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
  }
  
  /**
   * Check if device is blocked
   */
  static isDeviceBlocked(fingerprint: string): boolean {
    return this.blockedDevices.has(fingerprint);
  }
  
  /**
   * Check if IP is blocked
   */
  static isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }
  
  /**
   * Get all fraud attempts
   */
  static getFraudAttempts(): FraudAttempt[] {
    return [...this.fraudAttempts];
  }
  
  /**
   * Get fraud attempts for a specific student
   */
  static getStudentFraudAttempts(studentId: string): FraudAttempt[] {
    return this.fraudAttempts.filter(attempt => attempt.studentId === studentId);
  }
  
  /**
   * Get fraud statistics
   */
  static getFraudStatistics(): {
    totalAttempts: number;
    fraudAttempts: number;
    blockedAttempts: number;
    fraudByType: Record<string, number>;
    fraudBySeverity: Record<string, number>;
  } {
    const stats = {
      totalAttempts: Array.from(this.attendanceAttempts.values()).flat().length,
      fraudAttempts: this.fraudAttempts.length,
      blockedAttempts: this.fraudAttempts.filter(f => f.blocked).length,
      fraudByType: {} as Record<string, number>,
      fraudBySeverity: {} as Record<string, number>
    };
    
    // Count by type
    for (const attempt of this.fraudAttempts) {
      stats.fraudByType[attempt.type] = (stats.fraudByType[attempt.type] || 0) + 1;
      stats.fraudBySeverity[attempt.severity] = (stats.fraudBySeverity[attempt.severity] || 0) + 1;
    }
    
    return stats;
  }
  
  /**
   * Clear old data (for privacy and performance)
   */
  static clearOldData(daysToKeep: number = 30): void {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    // Clear old fraud attempts
    this.fraudAttempts = this.fraudAttempts.filter(attempt => attempt.timestamp >= cutoff);
    
    // Clear old attendance attempts
    for (const [studentId, attempts] of this.attendanceAttempts.entries()) {
      const recentAttempts = attempts.filter(attempt => attempt.timestamp >= cutoff);
      if (recentAttempts.length === 0) {
        this.attendanceAttempts.delete(studentId);
      } else {
        this.attendanceAttempts.set(studentId, recentAttempts);
      }
    }
  }
  
  /**
   * Export fraud data for analysis
   */
  static exportFraudData(): {
    attempts: AttendanceAttempt[];
    fraudAttempts: FraudAttempt[];
    blockedDevices: string[];
    blockedIPs: string[];
    statistics: ReturnType<typeof FraudDetectionEngine.getFraudStatistics>;
  } {
    return {
      attempts: Array.from(this.attendanceAttempts.values()).flat(),
      fraudAttempts: this.fraudAttempts,
      blockedDevices: Array.from(this.blockedDevices),
      blockedIPs: Array.from(this.blockedIPs),
      statistics: this.getFraudStatistics()
    };
  }
}