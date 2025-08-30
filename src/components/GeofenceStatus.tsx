import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getCurrentLocation, checkGeofence } from '@/lib/geofencing';
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
  onLocationVerified: (verified: boolean, location: { lat: number; lng: number; accuracy: number }) => void;
}

export function GeofenceStatus({ geofences, onLocationVerified }: GeofenceStatusProps) {
  const [locationStatus, setLocationStatus] = useState<'checking' | 'inside' | 'outside' | 'error' | 'denied' | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkLocation = async () => {
    setLocationStatus('checking');
    setErrorMessage(null);

    try {
      const position = await getCurrentLocation();
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      
      setAccuracy(position.coords.accuracy);

      // Check if accuracy is acceptable
      if (position.coords.accuracy > 50) {
        setLocationStatus('error');
        setErrorMessage(`Location accuracy is too low (${Math.round(position.coords.accuracy)}m). Please try again or connect to Wi-Fi.`);
        onLocationVerified(false, { ...userLocation, accuracy: position.coords.accuracy });
        return;
      }

      const { isInside } = checkGeofence(userLocation, geofences);
      
      if (isInside) {
        setLocationStatus('inside');
        onLocationVerified(true, { ...userLocation, accuracy: position.coords.accuracy });
      } else {
        setLocationStatus('outside');
        setErrorMessage('You must be on campus to mark attendance.');
        onLocationVerified(false, { ...userLocation, accuracy: position.coords.accuracy });
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
  };

  useEffect(() => {
    checkLocation();
  }, []);

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
    </div>
  );
}