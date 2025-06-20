"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import DashboardLayout from "@/components/seller-dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  QrCode, 
  UserCheck, 
  Users, 
  Camera, 
  Search, 
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Spinner from "@/components/Spinner";

interface AttendeeData {
  ticketId: string;
  userName: string;
  userEmail: string;
  status: string;
  checkInTime?: number;
  ticketType: string;
}

export default function CheckInPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  
  // States
  const [activeTab, setActiveTab] = useState<'scan' | 'list'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<AttendeeData[]>([]);
  
  // Video ref for camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Data queries
  const event = useQuery(api.events.getById, { 
    eventId: eventId as Id<"events"> 
  });
  
  const tickets = useQuery(api.tickets.getEventTickets, {
    eventId: eventId as Id<"events">
  });
  
  const updateTicketStatus = useMutation(api.tickets.updateTicketStatus);
  
  // Camera management
  const startCamera = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      toast.error('Camera access denied. Please allow camera permission.');
      setIsScanning(false);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };
  
  // QR Code processing with jsQR integration
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Use dynamic import for jsQR to avoid SSR issues
    import('jsqr').then(({ default: jsQR }) => {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        let ticketId = code.data;
        
        // Extract ticket ID from URL if it's a full QR URL
        if (ticketId.includes('/validate-ticket/')) {
          ticketId = ticketId.split('/validate-ticket/')[1];
        }
        
        processQRCode(ticketId);
        stopCamera();
      }
    }).catch((error) => {
      console.error('QR scanning error:', error);
    });
  };
  
  // Auto-scan when camera is active
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(scanQRCode, 100); // Scan every 100ms
      return () => clearInterval(interval);
    }
  }, [isScanning]);
  
  const processQRCode = async (ticketId: string) => {
    try {
      await updateTicketStatus({
        ticketId: ticketId as Id<"tickets">,
        status: "used"
      });
      
      // Find ticket details
      const ticket = tickets?.find(t => t._id === ticketId);
      if (ticket) {
        const newCheckIn: AttendeeData = {
          ticketId,
          userName: ticket.userName || 'Unknown',
          userEmail: ticket.userEmail || '',
          status: 'used',
          checkInTime: Date.now(),
          ticketType: ticket.ticketType || 'General'
        };
        
        setRecentCheckIns(prev => [newCheckIn, ...prev.slice(0, 9)]);
        toast.success(`✅ ${ticket.userName} checked in successfully!`);
      }
    } catch (error) {
      console.error('Check-in failed:', error);
      toast.error('Check-in failed. Please try again.');
    }
  };
  
  // Manual ticket ID entry
  const handleManualCheckIn = async () => {
    if (!scanResult?.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }
    
    // Extract ticket ID from URL if it's a full QR URL
    let ticketId = scanResult.trim();
    if (ticketId.includes('/validate-ticket/')) {
      ticketId = ticketId.split('/validate-ticket/')[1];
    }
    
    await processQRCode(ticketId);
    setScanResult('');
  };
  
  // Calculate stats
  const totalTickets = tickets?.length || 0;
  const checkedInCount = tickets?.filter(t => t.status === 'used').length || 0;
  const validTickets = tickets?.filter(t => t.status === 'valid').length || 0;
  
  // Filter attendees for search
  const filteredTickets = tickets?.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.userName?.toLowerCase().includes(query) ||
      ticket.userEmail?.toLowerCase().includes(query) ||
      ticket._id.toLowerCase().includes(query)
    );
  }) || [];
  
  // Export attendee list
  const exportAttendeeList = () => {
    if (!tickets) return;
    
    const csvData = [
      ['Name', 'Email', 'Ticket ID', 'Status', 'Check-in Time', 'Ticket Type'],
      ...tickets.map(ticket => [
        ticket.userName || 'Unknown',
        ticket.userEmail || 'Unknown',
        ticket._id,
        ticket.status,
                 ticket.status === 'used' ? format(new Date(), 'yyyy-MM-dd HH:mm:ss') : 'Not checked in',
        ticket.ticketType || 'General'
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.name || 'event'}-attendees-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Attendee list exported!');
  };
  
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  if (!user || !event) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }
  
  if (event.userId !== user.id) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-screen">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this event's check-in.</p>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Event Check-In
              </h1>
              <p className="text-gray-600">{event.name}</p>
            </div>
          </div>
          <Button onClick={exportAttendeeList} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export List
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Tickets</p>
                  <p className="text-2xl font-bold">{totalTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Checked In</p>
                  <p className="text-2xl font-bold">{checkedInCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold">{validTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold">
                    {totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('scan')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'scan' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Scanner
            </div>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'list' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Attendee List
            </div>
          </button>
        </div>
        
        {/* Content */}
        {activeTab === 'scan' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  QR Code Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {isScanning ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Camera not active</p>
                      </div>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="flex gap-2">
                  {!isScanning ? (
                    <Button onClick={startCamera} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </Button>
                  ) : (
                    <Button onClick={stopCamera} variant="outline" className="flex-1">
                      Stop Camera
                    </Button>
                  )}
                </div>
                
                {/* Manual Entry */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Or enter ticket ID manually:</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ticket ID or QR URL"
                      value={scanResult || ''}
                      onChange={(e) => setScanResult(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                    />
                    <Button onClick={handleManualCheckIn}>
                      Check In
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Check-ins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Recent Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCheckIns.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No recent check-ins
                    </p>
                  ) : (
                    recentCheckIns.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-medium text-green-900">{attendee.userName}</p>
                          <p className="text-sm text-green-700">{attendee.ticketType}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="default" className="bg-green-500">
                            Checked In
                          </Badge>
                          <p className="text-xs text-green-600 mt-1">
                            {attendee.checkInTime && format(new Date(attendee.checkInTime), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Attendee List */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Attendees
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search attendees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredTickets.map((ticket) => (
                  <div key={ticket._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                                             <div className={`w-3 h-3 rounded-full ${
                         ticket.status === 'used' ? 'bg-green-500' : 'bg-orange-500'
                       }`} />
                      <div>
                        <p className="font-medium">{ticket.userName || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{ticket.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{ticket.ticketType || 'General'}</p>
                        <p className="text-xs text-gray-500">ID: {ticket._id.slice(-8)}</p>
                      </div>
                                             <Badge 
                         variant={ticket.status === 'used' ? 'default' : 'secondary'}
                         className={ticket.status === 'used' ? 'bg-green-500' : ''}
                       >
                         {ticket.status === 'used' ? 'Checked In' : 'Pending'}
                       </Badge>
                       {ticket.status === 'valid' && (
                        <Button
                          size="sm"
                          onClick={() => processQRCode(ticket._id)}
                          className="ml-2"
                        >
                          Check In
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredTickets.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchQuery ? 'No attendees match your search' : 'No attendees found'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 