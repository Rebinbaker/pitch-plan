import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhotoVerificationProps {
  onPhotoUploaded: (photoUrl: string) => void;
  disabled?: boolean;
  existingPhotoUrl?: string;
}

export const PhotoVerification: React.FC<PhotoVerificationProps> = ({
  onPhotoUploaded,
  disabled = false,
  existingPhotoUrl
}) => {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(existingPhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { toast } = useToast();

  const startCamera = async () => {
    console.log('Starting camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Changed to 'user' for front camera (better for selfies)
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log('Camera stream obtained:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Video element set with stream');
        
        // Wait for video to load and play
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          videoRef.current?.play().then(() => {
            console.log('Video playing successfully');
            setIsCameraActive(true);
            setError(null);
          }).catch(err => {
            console.error('Error playing video:', err);
            setError('Kunde inte starta video-uppspelning');
          });
        };
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      let errorMessage = 'Kunde inte starta kameran';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Du måste tillåta kameraåtkomst';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Ingen kamera hittades';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Kameran används redan av ett annat program';
      }
      
      setError(errorMessage);
      toast({
        title: "Kamerafel",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoDataUrl);
    stopCamera();
    uploadPhoto(photoDataUrl);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vänligen välj en bildfil');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Bilden är för stor. Max 5MB tillåtet.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoDataUrl = e.target?.result as string;
      setCapturedPhoto(photoDataUrl);
      uploadPhotoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (photoDataUrl: string) => {
    setIsUploading(true);
    setError(null);

    try {
      // Convert data URL to blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();
      
      const fileName = `time-verification/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('lokalahantverkarna')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lokalahantverkarna')
        .getPublicUrl(fileName);

      onPhotoUploaded(urlData.publicUrl);
      
      toast({
        title: "Foto uppladdad",
        description: "Verifieringsfoto har sparats",
      });

    } catch (error: any) {
      setError('Kunde inte ladda upp foto: ' + error.message);
      toast({
        title: "Uppladdningsfel",
        description: "Kunde inte ladda upp foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadPhotoFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const fileName = `time-verification/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('lokalahantverkarna')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lokalahantverkarna')
        .getPublicUrl(fileName);

      onPhotoUploaded(urlData.publicUrl);
      
      toast({
        title: "Foto uppladdad",
        description: "Verifieringsfoto har sparats",
      });

    } catch (error: any) {
      setError('Kunde inte ladda upp foto: ' + error.message);
      toast({
        title: "Uppladdningsfel",
        description: "Kunde inte ladda upp foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setCapturedPhoto(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-primary" />
        <span className="font-medium">Fotoverifiering</span>
      </div>

      {error && (
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {capturedPhoto && (
        <div className="space-y-2">
          <div className="relative">
            <img 
              src={capturedPhoto} 
              alt="Verification photo" 
              className="w-full h-48 object-cover rounded-lg border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={removePhoto}
              disabled={disabled || isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              ✅ Verifieringsfoto uppladdad
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!capturedPhoto && (
        <>
          {isCameraActive && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover rounded-lg border bg-black"
                  style={{ transform: 'scaleX(-1)' }} // Mirror the video like a selfie
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <Button 
                    onClick={capturePhoto} 
                    size="lg"
                    className="rounded-full w-16 h-16 bg-white text-black hover:bg-gray-200"
                  >
                    <Camera className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={stopCamera} className="flex-1">
                  Avbryt kamera
                </Button>
              </div>
            </div>
          )}

          {!isCameraActive && (
            <div className="flex gap-2">
              <Button
                onClick={startCamera}
                disabled={disabled || isUploading}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isUploading ? 'Laddar upp...' : 'Ta foto'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp
              </Button>
            </div>
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};