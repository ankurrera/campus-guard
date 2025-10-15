/**
 * Biometric Consent Modal Component
 * Displays consent form for biometric data collection and storage
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Shield, AlertTriangle, Lock, Eye, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export interface BiometricConsentData {
  consent: boolean;
  consentDate: Date;
  purposes: string[];
}

interface BiometricConsentModalProps {
  open: boolean;
  onConsent: (data: BiometricConsentData) => void;
  onDecline: () => void;
}

export function BiometricConsentModal({
  open,
  onConsent,
  onDecline,
}: BiometricConsentModalProps) {
  const [understood, setUnderstood] = useState(false);
  const [agreeToStorage, setAgreeToStorage] = useState(false);
  const [agreeToProcessing, setAgreeToProcessing] = useState(false);

  const canProceed = understood && agreeToStorage && agreeToProcessing;

  const handleConsent = () => {
    if (!canProceed) return;

    const consentData: BiometricConsentData = {
      consent: true,
      consentDate: new Date(),
      purposes: ['attendance_verification', '3d_face_recognition'],
    };

    onConsent(consentData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <DialogTitle className="text-2xl">Biometric Data Consent</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            We need your consent to collect and store 3D biometric face data for attendance verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please read this carefully before providing consent. You have the right to decline.
            </AlertDescription>
          </Alert>

          {/* What we collect */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              What Biometric Data We Collect
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-7">
              <li>3D face mesh and point cloud data</li>
              <li>Depth maps from your face</li>
              <li>Face embeddings (mathematical representations)</li>
              <li>2D facial images for reference</li>
            </ul>
          </div>

          {/* How we use it */}
          <div>
            <h3 className="font-semibold text-lg mb-3">How We Use This Data</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-7">
              <li>Verify your identity for attendance marking</li>
              <li>Prevent fraudulent attendance attempts</li>
              <li>Enhance security with 3D face recognition</li>
              <li>Detect spoofing attempts (photos, videos, masks)</li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security & Privacy
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-7">
              <li>All biometric data is encrypted at rest</li>
              <li>Access is restricted to authorized systems only</li>
              <li>Data is stored securely in compliance with privacy regulations</li>
              <li>We never share your biometric data with third parties</li>
            </ul>
          </div>

          {/* Your Rights */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Your Rights
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-7">
              <li>You can withdraw consent at any time</li>
              <li>You can request deletion of your biometric data</li>
              <li>You can request a copy of your stored data</li>
              <li>You can continue using 2D face recognition if you decline</li>
            </ul>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
              />
              <label
                htmlFor="understood"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I have read and understood the information about biometric data collection
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="storage"
                checked={agreeToStorage}
                onCheckedChange={(checked) => setAgreeToStorage(checked === true)}
              />
              <label
                htmlFor="storage"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I consent to the collection and secure storage of my 3D biometric face data
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="processing"
                checked={agreeToProcessing}
                onCheckedChange={(checked) => setAgreeToProcessing(checked === true)}
              />
              <label
                htmlFor="processing"
                className="text-sm font-medium leading-relaxed cursor-pointer"
              >
                I consent to the processing of my biometric data for attendance verification
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button
            onClick={handleConsent}
            disabled={!canProceed}
            className="min-w-32"
          >
            I Consent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
