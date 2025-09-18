export interface IPGeolocationData {
  ip: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isp: string;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  timezone: string;
}

export interface LocationVerificationResult {
  isValid: boolean;
  confidence: number;
  gpsLocation: { lat: number; lng: number; accuracy: number };
  ipLocation?: { lat: number; lng: number };
  distanceDiscrepancy?: number;
  fraudIndicators: {
    vpnDetected: boolean;
    proxyDetected: boolean;
    torDetected: boolean;
    hostingDetected: boolean;
    locationSpoofing: boolean;
    timezoneMismatch: boolean;
    impossibleSpeed: boolean;
  };
  details: {
    ipInfo?: IPGeolocationData;
    userAgent: string;
    browserFingerprint: string;
    networkType?: string;
  };
}

/**
 * Device and browser fingerprinting for fraud detection
 */
export class DeviceFingerprinting {
  
  static generateFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Canvas fingerprinting
    let canvasFingerprint = '';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint test', 2, 2);
      canvasFingerprint = canvas.toDataURL();
    }
    
    // Screen and device info
    const screenInfo = {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight
    };
    
    // Browser info
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints
    };
    
    // Timezone info
    const timezoneInfo = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset()
    };
    
    // WebGL fingerprinting
    let webglFingerprint = '';
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          webglFingerprint = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) + 
                           gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      // WebGL not supported
    }
    
    // Combine all data
    const fingerprint = JSON.stringify({
      screen: screenInfo,
      browser: browserInfo,
      timezone: timezoneInfo,
      canvas: canvasFingerprint.slice(-50), // Last 50 chars
      webgl: webglFingerprint
    });
    
    // Generate hash
    return this.simpleHash(fingerprint);
  }
  
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  static detectBrowserExtensions(): string[] {
    const detectedExtensions: string[] = [];
    
    // Check for common location spoofing extensions by testing for their artifacts
    try {
      // Check for modified geolocation objects
      if ('geolocation' in navigator) {
        const geoProto = Object.getPrototypeOf(navigator.geolocation);
        const geoDescriptor = Object.getOwnPropertyDescriptor(geoProto, 'getCurrentPosition');
        
        if (geoDescriptor && geoDescriptor.value.toString().includes('native code') === false) {
          detectedExtensions.push('location-spoofer');
        }
      }
      
      // Check for VPN detection evasion
      if (typeof (window as any).chrome !== 'undefined' && typeof (window as any).chrome.runtime !== 'undefined') {
        detectedExtensions.push('chrome-extension-detected');
      }
      
      // Check for developer tools
      const devtools = {
        open: false,
        orientation: null as string | null
      };
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200) {
          devtools.open = true;
          devtools.orientation = 'vertical';
        } else if (window.outerWidth - window.innerWidth > 200) {
          devtools.open = true;
          devtools.orientation = 'horizontal';
        } else {
          devtools.open = false;
          devtools.orientation = null;
        }
      }, 500);
      
      if (devtools.open) {
        detectedExtensions.push('devtools-open');
      }
      
    } catch (error) {
      console.warn('Extension detection error:', error);
    }
    
    return detectedExtensions;
  }
}

/**
 * IP Geolocation service for location verification
 */
export class IPGeolocationService {
  
  static async getIPGeolocation(): Promise<IPGeolocationData | null> {
    try {
      // Using multiple free services as fallback
      const services = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://ipinfo.io/json'
      ];
      
      for (const serviceUrl of services) {
        try {
          const response = await fetch(serviceUrl);
          if (!response.ok) continue;
          
          const data = await response.json();
          
          // Normalize response format
          return this.normalizeIPData(data, serviceUrl);
          
        } catch (error) {
          console.warn(`IP service ${serviceUrl} failed:`, error);
          continue;
        }
      }
      
      throw new Error('All IP geolocation services failed');
      
    } catch (error) {
      console.error('IP geolocation error:', error);
      return null;
    }
  }
  
  private static normalizeIPData(data: unknown, serviceUrl: string): IPGeolocationData {
    const ipData = data as Record<string, unknown>;
    // Different services have different response formats
    if (serviceUrl.includes('ipapi.co')) {
      return {
        ip: String(ipData.ip || ''),
        city: String(ipData.city || ''),
        region: String(ipData.region || ''),
        country: String(ipData.country_name || ''),
        latitude: parseFloat(String(ipData.latitude)) || 0,
        longitude: parseFloat(String(ipData.longitude)) || 0,
        accuracy: 10000, // City level accuracy
        isp: String(ipData.org || ''),
        isVPN: (ipData.threat_types as any)?.includes?.('vpn') || false,
        isProxy: (ipData.threat_types as any)?.includes?.('proxy') || false,
        isTor: (ipData.threat_types as any)?.includes?.('tor') || false,
        isHosting: (ipData.threat_types as any)?.includes?.('hosting') || false,
        timezone: String(ipData.timezone || '')
      };
    } else if (serviceUrl.includes('ip-api.com')) {
      return {
        ip: String(ipData.query || ''),
        city: String(ipData.city || ''),
        region: String(ipData.regionName || ''),
        country: String(ipData.country || ''),
        latitude: Number(ipData.lat) || 0,
        longitude: Number(ipData.lon) || 0,
        accuracy: 10000,
        isp: String(ipData.isp || ''),
        isVPN: Boolean(ipData.proxy) || false,
        isProxy: Boolean(ipData.proxy) || false,
        isTor: false, // Not provided by this service
        isHosting: Boolean(ipData.hosting) || false,
        timezone: String(ipData.timezone || '')
      };
    } else {
      // ipinfo.io format
      const [lat, lng] = String(ipData.loc || '0,0').split(',').map(parseFloat);
      return {
        ip: String(ipData.ip || ''),
        city: String(ipData.city || ''),
        region: String(ipData.region || ''),
        country: String(ipData.country || ''),
        latitude: lat || 0,
        longitude: lng || 0,
        accuracy: 10000,
        isp: String(ipData.org || ''),
        isVPN: false, // Free tier doesn't provide this
        isProxy: false,
        isTor: false,
        isHosting: false,
        timezone: String(ipData.timezone || '')
      };
    }
  }
  
  static detectVPNIndicators(ipData: IPGeolocationData): boolean {
    const vpnIndicators = [
      // Common VPN ISP patterns
      /vpn/i,
      /proxy/i,
      /hosting/i,
      /datacenter/i,
      /cloud/i,
      /server/i,
      /digital ocean/i,
      /amazon/i,
      /google cloud/i,
      /microsoft azure/i
    ];
    
    return vpnIndicators.some(pattern => 
      pattern.test(ipData.isp) || 
      ipData.isVPN || 
      ipData.isProxy || 
      ipData.isHosting
    );
  }
}

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
 * Comprehensive location security analyzer
 */
export class LocationSecurityAnalyzer {
  private static lastLocation: { lat: number; lng: number; timestamp: number } | null = null;
  
  static async verifyLocation(
    gpsLocation: { lat: number; lng: number; accuracy: number }
  ): Promise<LocationVerificationResult> {
    
    const userAgent = navigator.userAgent;
    const browserFingerprint = DeviceFingerprinting.generateFingerprint();
    const detectedExtensions = DeviceFingerprinting.detectBrowserExtensions();
    
    // Get IP-based location
    const ipData = await IPGeolocationService.getIPGeolocation();
    
    const fraudIndicators = {
      vpnDetected: false,
      proxyDetected: false,
      torDetected: false,
      hostingDetected: false,
      locationSpoofing: false,
      timezoneMismatch: false,
      impossibleSpeed: false
    };
    
    let confidence = 1.0;
    let distanceDiscrepancy: number | undefined;
    
    if (ipData) {
      // Check for VPN/Proxy
      fraudIndicators.vpnDetected = ipData.isVPN || IPGeolocationService.detectVPNIndicators(ipData);
      fraudIndicators.proxyDetected = ipData.isProxy;
      fraudIndicators.torDetected = ipData.isTor;
      fraudIndicators.hostingDetected = ipData.isHosting;
      
      // Calculate distance between GPS and IP location
      distanceDiscrepancy = calculateDistance(
        gpsLocation.lat,
        gpsLocation.lng,
        ipData.latitude,
        ipData.longitude
      );
      
      // Check for unreasonable distance (>100km suggests spoofing)
      if (distanceDiscrepancy > 100000) {
        fraudIndicators.locationSpoofing = true;
        confidence -= 0.4;
      } else if (distanceDiscrepancy > 50000) {
        confidence -= 0.2;
      }
      
      // Check timezone consistency
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (ipData.timezone && browserTimezone !== ipData.timezone) {
        fraudIndicators.timezoneMismatch = true;
        confidence -= 0.1;
      }
      
      // Reduce confidence for VPN/Proxy
      if (fraudIndicators.vpnDetected) confidence -= 0.3;
      if (fraudIndicators.proxyDetected) confidence -= 0.2;
      if (fraudIndicators.torDetected) confidence -= 0.4;
      if (fraudIndicators.hostingDetected) confidence -= 0.2;
    }
    
    // Check for impossible speed (teleportation detection)
    if (this.lastLocation) {
      const timeDiff = (Date.now() - this.lastLocation.timestamp) / 1000; // seconds
      const distance = calculateDistance(
        gpsLocation.lat,
        gpsLocation.lng,
        this.lastLocation.lat,
        this.lastLocation.lng
      );
      
      const speedMps = distance / timeDiff; // meters per second
      const speedKmh = speedMps * 3.6; // km/h
      
      // If speed > 200 km/h, likely spoofing (unless it's the first check in a while)
      if (speedKmh > 200 && timeDiff < 3600) { // Less than 1 hour
        fraudIndicators.impossibleSpeed = true;
        confidence -= 0.5;
      }
    }
    
    // Update last location
    this.lastLocation = {
      lat: gpsLocation.lat,
      lng: gpsLocation.lng,
      timestamp: Date.now()
    };
    
    // Check for suspicious browser extensions
    if (detectedExtensions.includes('location-spoofer')) {
      confidence -= 0.3;
    }
    
    // GPS accuracy check
    if (gpsLocation.accuracy > 100) {
      confidence -= 0.1;
    } else if (gpsLocation.accuracy > 50) {
      confidence -= 0.05;
    }
    
    // Network type detection (if available)
    let networkType: string | undefined;
    try {
      // @ts-expect-error - Experimental API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        networkType = connection.effectiveType || connection.type;
      }
    } catch (error) {
      // Network information not available
    }
    
    const isValid = confidence >= 0.6 && !fraudIndicators.vpnDetected && !fraudIndicators.locationSpoofing;
    
    return {
      isValid,
      confidence: Math.max(0, confidence),
      gpsLocation,
      ipLocation: ipData ? { lat: ipData.latitude, lng: ipData.longitude } : undefined,
      distanceDiscrepancy,
      fraudIndicators,
      details: {
        ipInfo: ipData || undefined,
        userAgent,
        browserFingerprint,
        networkType
      }
    };
  }
  
  static clearLocationHistory(): void {
    this.lastLocation = null;
  }
}

/**
 * Security headers and environment validation
 */
export class SecurityEnvironment {
  
  static validateSecurityHeaders(): {
    isSecure: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check if running over HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('Not running over HTTPS');
    }
    
    // Check for secure context (required for many security features)
    if (!window.isSecureContext) {
      issues.push('Not in a secure context');
    }
    
    // Check if geolocation is available
    if (!navigator.geolocation) {
      issues.push('Geolocation not available');
    }
    
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push('Camera access not available');
    }
    
    return {
      isSecure: issues.length === 0,
      issues
    };
  }
  
  static async checkPermissions(): Promise<{
    camera: PermissionState;
    location: PermissionState;
  }> {
    const permissions = {
      camera: 'denied' as PermissionState,
      location: 'denied' as PermissionState
    };
    
    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        permissions.camera = cameraPermission.state;
        permissions.location = locationPermission.state;
      }
    } catch (error) {
      console.warn('Permission check failed:', error);
    }
    
    return permissions;
  }
}