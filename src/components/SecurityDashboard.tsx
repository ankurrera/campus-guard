import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Activity, TrendingUp, Ban, Eye, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FraudDetectionEngine, FraudAttempt } from '@/lib/fraudDetection';
import { SecurityTester, SecurityMonitor, SecurityTestResults } from '@/lib/securityTesting';
import { cn } from '@/lib/utils';

interface SecurityDashboardProps {
  className?: string;
}

export function SecurityDashboard({ className }: SecurityDashboardProps) {
  const [securityResults, setSecurityResults] = useState<SecurityTestResults | null>(null);
  const [fraudAttempts, setFraudAttempts] = useState<FraudAttempt[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [securityMetrics, setSecurityMetrics] = useState({
    totalAttempts: 0,
    fraudAttempts: 0,
    blockedAttempts: 0,
    averageConfidence: 1.0,
    lastUpdated: new Date()
  });

  useEffect(() => {
    // Load initial data
    loadSecurityData();
    
    // Set up real-time monitoring
    const interval = setInterval(loadSecurityData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = () => {
    const monitor = SecurityMonitor.getInstance();
    setSecurityMetrics(monitor.getSecurityMetrics());
    setFraudAttempts(monitor.getFraudAttempts());
  };

  const runSecurityTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await SecurityTester.runSecurityTests();
      setSecurityResults(results);
    } catch (error) {
      console.error('Security tests failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getSecurityStatusColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityStatusBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="default" className="bg-green-600">Excellent</Badge>;
    if (score >= 0.6) return <Badge variant="secondary" className="bg-yellow-600">Good</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              Last updated: {securityMetrics.lastUpdated.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Attempts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{securityMetrics.fraudAttempts}</div>
            <p className="text-xs text-muted-foreground">
              {securityMetrics.blockedAttempts} blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getSecurityStatusColor(securityMetrics.averageConfidence))}>
              {Math.round(securityMetrics.averageConfidence * 100)}%
            </div>
            <Progress value={securityMetrics.averageConfidence * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Tests Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Assessment
            </CardTitle>
            <Button 
              onClick={runSecurityTests}
              disabled={isRunningTests}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunningTests ? 'Running Tests...' : 'Run Security Tests'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {securityResults ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Overall Security Score</h3>
                <div className="flex items-center gap-2">
                  <span className={cn("text-2xl font-bold", getSecurityStatusColor(securityResults.overallSecurityScore))}>
                    {Math.round(securityResults.overallSecurityScore * 100)}%
                  </span>
                  {getSecurityStatusBadge(securityResults.overallSecurityScore)}
                </div>
              </div>

              <Tabs defaultValue="face" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="face">Face Security</TabsTrigger>
                  <TabsTrigger value="location">Location Security</TabsTrigger>
                  <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
                </TabsList>

                <TabsContent value="face" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Depth Analysis</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.faceSecurityTests.depthAnalysis.score))}>
                          {Math.round(securityResults.faceSecurityTests.depthAnalysis.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.faceSecurityTests.depthAnalysis.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.faceSecurityTests.depthAnalysis.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Texture Analysis</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.faceSecurityTests.textureAnalysis.score))}>
                          {Math.round(securityResults.faceSecurityTests.textureAnalysis.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.faceSecurityTests.textureAnalysis.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.faceSecurityTests.textureAnalysis.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Motion Detection</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.faceSecurityTests.motionDetection.score))}>
                          {Math.round(securityResults.faceSecurityTests.motionDetection.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.faceSecurityTests.motionDetection.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.faceSecurityTests.motionDetection.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Multiple Face Detection</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.faceSecurityTests.multiplefaces.score))}>
                          {Math.round(securityResults.faceSecurityTests.multiplefaces.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.faceSecurityTests.multiplefaces.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.faceSecurityTests.multiplefaces.description}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">GPS Integrity</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.locationSecurityTests.gpsIntegrity.score))}>
                          {Math.round(securityResults.locationSecurityTests.gpsIntegrity.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.locationSecurityTests.gpsIntegrity.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.locationSecurityTests.gpsIntegrity.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">VPN Detection</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.locationSecurityTests.vpnDetection.score))}>
                          {Math.round(securityResults.locationSecurityTests.vpnDetection.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.locationSecurityTests.vpnDetection.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.locationSecurityTests.vpnDetection.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">IP-GPS Matching</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.locationSecurityTests.ipLocationMatch.score))}>
                          {Math.round(securityResults.locationSecurityTests.ipLocationMatch.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.locationSecurityTests.ipLocationMatch.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.locationSecurityTests.ipLocationMatch.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Device Fingerprinting</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.locationSecurityTests.deviceFingerprint.score))}>
                          {Math.round(securityResults.locationSecurityTests.deviceFingerprint.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.locationSecurityTests.deviceFingerprint.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.locationSecurityTests.deviceFingerprint.description}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fraud" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pattern Recognition</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.fraudDetectionTests.patternRecognition.score))}>
                          {Math.round(securityResults.fraudDetectionTests.patternRecognition.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.fraudDetectionTests.patternRecognition.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.fraudDetectionTests.patternRecognition.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Rate Limiting</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.fraudDetectionTests.rateLimit.score))}>
                          {Math.round(securityResults.fraudDetectionTests.rateLimit.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.fraudDetectionTests.rateLimit.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.fraudDetectionTests.rateLimit.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Device Blocking</span>
                        <span className={cn("font-medium", getSecurityStatusColor(securityResults.fraudDetectionTests.deviceBlocking.score))}>
                          {Math.round(securityResults.fraudDetectionTests.deviceBlocking.score * 100)}%
                        </span>
                      </div>
                      <Progress value={securityResults.fraudDetectionTests.deviceBlocking.score * 100} />
                      <p className="text-xs text-muted-foreground">{securityResults.fraudDetectionTests.deviceBlocking.description}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {securityResults.recommendations.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Security Recommendations</h4>
                  <ul className="space-y-1">
                    {securityResults.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Run security tests to see detailed analysis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fraud Attempts Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Recent Fraud Attempts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fraudAttempts.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {fraudAttempts.slice(-10).reverse().map((attempt) => (
                <div key={attempt.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(attempt.severity)}>
                        {attempt.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{attempt.type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {attempt.timestamp.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Student ID:</span>
                      <span className="ml-2 font-mono">{attempt.studentId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="ml-2 font-medium">{Math.round(attempt.confidence * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Device:</span>
                      <span className="ml-2 font-mono text-xs">{attempt.details.deviceFingerprint.slice(0, 12)}...</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className={cn("ml-2 font-medium", attempt.blocked ? "text-red-600" : "text-yellow-600")}>
                        {attempt.blocked ? 'BLOCKED' : 'FLAGGED'}
                      </span>
                    </div>
                  </div>

                  {attempt.details.location && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        GPS: {attempt.details.location.gps.lat.toFixed(4)}, {attempt.details.location.gps.lng.toFixed(4)}
                      </div>
                      {attempt.details.location.discrepancy && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          {Math.round(attempt.details.location.discrepancy / 1000)}km discrepancy
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No fraud attempts detected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}