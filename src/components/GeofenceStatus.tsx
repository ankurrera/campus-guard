/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, CheckCircle, XCircle, AlertCircle, Shield, Globe, Wifi } from 'lucide-react';
import { getCurrentLocation, checkGeofence } from '@/lib/geofencing';
import { LocationSecurityAnalyzer, LocationVerificationResult } from '@/lib/locationSecurity';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { buttonVariants } from './ui/button-variants';
import { cn } from '@/lib/utils';

interface GeofenceStatusProps {
  geofences: Array<{
    type: 'polygon' | 'radius';
    coordinates?: Array<{ lat: number; lng: number }>;
    center?: { lat: number; lng: number };
    radius?: number;
    active: boolean;
  }>;
  onLocationVerified: (verified: boolean, location: { lat: number; lng: number; accuracy: number }, securityResult?: LocationVerificationResult) => void;
}

export function GeofenceStatus({ geofences, onLocationVerified }: GeofenceStatusProps) {
  const [locationStatus, setLocationStatus] = useState<'checking' | 'inside' | 'outside' | 'error' | 'denied' | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [securityResult, setSecurityResult] = useState<LocationVerificationResult | null>(null);

  const checkLocation = useCallback(async () => {
    setLocationStatus('checking');
    setErrorMessage(null);

    try {
      const position = await getCurrentLocation();
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      
      setAccuracy(position.coords.accuracy);

      // Enhanced security verification
      const securityAnalysis = await LocationSecurityAnalyzer.verifyLocation(userLocation);
      setSecurityResult(securityAnalysis);

      // Check if accuracy is acceptable
      if (position.coords.accuracy > 50) {
        setLocationStatus('error');
        setErrorMessage(`Location accuracy is too low (${Math.round(position.coords.accuracy)}m). Please try again or connect to Wi-Fi.`);
        onLocationVerified(false, userLocation, securityAnalysis);
        return;
      }

      // Check for security violations
      if (!securityAnalysis.isValid) {
        setLocationStatus('error');
        
        let securityMessage = 'Security verification failed: ';
        const { fraudIndicators } = securityAnalysis;
        
        if (fraudIndicators.vpnDetected) {
          securityMessage += 'VPN/Proxy detected. ';
        }
        if (fraudIndicators.locationSpoofing) {
          securityMessage += 'Location spoofing detected. ';
        }
        if (fraudIndicators.impossibleSpeed) {
          securityMessage += 'Impossible travel speed detected. ';
        }
        if (fraudIndicators.timezoneMismatch) {
          securityMessage += 'Timezone mismatch detected. ';
        }
        
        securityMessage += 'Please disable VPN and location spoofing tools.';
        setErrorMessage(securityMessage);
        onLocationVerified(false, userLocation, securityAnalysis);
        return;
      }

      // Check geofence after security verification
      const { isInside } = checkGeofence(userLocation, geofences);
      
      if (isInside) {
        setLocationStatus('inside');
        onLocationVerified(true, userLocation, securityAnalysis);
      } else {
        setLocationStatus('outside');
        setErrorMessage('You must be on campus to mark attendance.');
        onLocationVerified(false, userLocation, securityAnalysis);
      }
    } catch (error: any) {
      setLocationStatus('error');
      if (error.code === 1) {
        setLocationStatus('denied');
        setErrorMessage('Location access denied. Please enable location services to mark attendance.');
      } else {
        setErrorMessage('Unable to get your location. Please check your settings.');
      }
      onLocationVerified(false, { lat: 0, lng: 0, accuracy: 0 });
    }
  }, [geofences, onLocationVerified]);

  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Location Verification</h3>
          <MapPin className="w-5 h-5 text-primary" />
        </div>

        {locationStatus === 'checking' && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Checking your location...</span>
          </div>
        )}

        {locationStatus === 'inside' && (
          <div className="flex items-center gap-3 text-success">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">You are on campus</p>
              {accuracy && (
                <p className="text-sm text-muted-foreground">
                  Accuracy: ±{Math.round(accuracy)}m
                </p>
              )}
            </div>
          </div>
        )}

        {locationStatus === 'outside' && (
          <div className="flex items-center gap-3 text-destructive">
            <XCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">You are outside campus</p>
              <p className="text-sm text-muted-foreground">
                Please move to campus grounds to mark attendance
              </p>
            </div>
          </div>
        )}

        {locationStatus === 'denied' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-warning">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">Location access denied</p>
            </div>
            <p className="text-sm text-muted-foreground">
              To mark attendance, you need to enable location services:
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>1. Open your browser settings</li>
              <li>2. Find site permissions</li>
              <li>3. Allow location access for this site</li>
              <li>4. Refresh the page</li>
            </ol>
          </div>
        )}

        {errorMessage && locationStatus !== 'denied' && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {(locationStatus === 'error' || locationStatus === 'outside') && (
          <Button
            onClick={checkLocation}
            className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Retry Location Check
          </Button>
        )}
      </div>

      {/* Security Analysis Display */}
      {securityResult && (
        <div className="glass-card p-4 rounded-xl space-y-3 mt-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-primary" />
            Location Security Analysis
          </div>
          
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Security Score:</span>
              <span className={cn(
                "font-medium",
                securityResult.confidence > 0.8 ? "text-success" : 
                securityResult.confidence > 0.6 ? "text-warning" : "text-destructive"
              )}>
                {Math.round(securityResult.confidence * 100)}%
              </span>
            </div>
            
            {securityResult.distanceDiscrepancy && (
              <div className="flex items-center justify-between">
                <span>GPS-IP Distance:</span>
                <span className={cn(
                  "font-medium",
                  securityResult.distanceDiscrepancy < 50000 ? "text-success" : "text-warning"
                )}>
                  {Math.round(securityResult.distanceDiscrepancy / 1000)} km
                </span>
              </div>
            )}
            
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Security Checks:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={cn(
                  "flex items-center gap-1",
                  !securityResult.fraudIndicators.vpnDetected ? "text-success" : "text-destructive"
                )}>
                  <Globe className="w-3 h-3" />
                  {!securityResult.fraudIndicators.vpnDetected ? "No VPN" : "VPN Detected"}
                </div>
                
                <div className={cn(
                  "flex items-center gap-1",
                  !securityResult.fraudIndicators.locationSpoofing ? "text-success" : "text-destructive"
                )}>
                  <MapPin className="w-3 h-3" />
                  {!securityResult.fraudIndicators.locationSpoofing ? "GPS Valid" : "GPS Spoofed"}
                </div>
                
                <div className={cn(
                  "flex items-center gap-1",
                  !securityResult.fraudIndicators.impossibleSpeed ? "text-success" : "text-destructive"
                )}>
                  <Wifi className="w-3 h-3" />
                  {!securityResult.fraudIndicators.impossibleSpeed ? "Speed OK" : "Impossible Speed"}
                </div>
                
                <div className={cn(
                  "flex items-center gap-1",
                  !securityResult.fraudIndicators.timezoneMismatch ? "text-success" : "text-warning"
                )}>
                  <AlertCircle className="w-3 h-3" />
                  {!securityResult.fraudIndicators.timezoneMismatch ? "Timezone OK" : "Timezone Mismatch"}
                </div>
              </div>
            </div>
            
            {securityResult.details.ipInfo && (
              <div className="text-xs text-muted-foreground">
                ISP: {securityResult.details.ipInfo.isp.substring(0, 30)}...
                {securityResult.details.ipInfo.city && (
                  <span> • {securityResult.details.ipInfo.city}, {securityResult.details.ipInfo.country}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}