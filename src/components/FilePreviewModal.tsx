import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText } from 'lucide-react';
import { ProjectFile } from '@/types/files';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilePreviewModalProps {
  file: ProjectFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ file, isOpen, onClose }: FilePreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file || !isOpen) {
      setFileUrl('');
      return;
    }

    const getFileUrl = async () => {
      setLoading(true);
      try {
        console.log('Original file URL:', file.url);
        
        // Check if it's a placeholder/mock URL
        if (file.url === '#' || file.url === '' || file.url.startsWith('mock://')) {
          console.log('Mock file detected, cannot preview');
          setFileUrl('');
          setLoading(false);
          return;
        }
        
        // Check if it's a Supabase storage URL
        if (file.url.includes('supabase') && file.url.includes('/storage/v1/object/')) {
          // Extract bucket and path from the URL
          const urlParts = file.url.split('/storage/v1/object/');
          if (urlParts.length > 1) {
            let pathWithPossiblePublic = urlParts[1];
            console.log('Path after object:', pathWithPossiblePublic);
            
            // Remove 'public/' prefix if it exists for private buckets
            if (pathWithPossiblePublic.startsWith('public/')) {
              pathWithPossiblePublic = pathWithPossiblePublic.substring(7);
            }
            
            const pathParts = pathWithPossiblePublic.split('/');
            console.log('Path parts:', pathParts);
            
            if (pathParts.length > 0) {
              const bucket = pathParts[0];
              const filePath = pathParts.slice(1).join('/');
              
              console.log('Trying to create signed URL for bucket:', bucket, 'path:', filePath);
              
              // Check if bucket is public
              const publicBuckets = ['videos']; // Add known public buckets here
              
              if (publicBuckets.includes(bucket)) {
                // For public buckets, use the original URL
                console.log('Using public URL for bucket:', bucket);
                setFileUrl(file.url);
              } else {
                // Generate signed URL for private buckets
                const { data, error } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(filePath, 3600); // 1 hour expiry
                
                if (error) {
                  console.error('Error creating signed URL:', error);
                  // Try downloading the file directly
                  const { data: downloadData, error: downloadError } = await supabase.storage
                    .from(bucket)
                    .download(filePath);
                  
                  if (downloadError) {
                    console.error('Error downloading file:', downloadError);
                    setFileUrl(''); // Set empty to show error state
                  } else {
                    // Create blob URL for preview
                    const blob = new Blob([downloadData], { type: downloadData.type || 'application/pdf' });
                    const blobUrl = URL.createObjectURL(blob);
                    setFileUrl(blobUrl);
                  }
                } else {
                  console.log('Signed URL created successfully:', data.signedUrl);
                  setFileUrl(data.signedUrl);
                }
              }
            } else {
              console.log('No valid path parts found');
              setFileUrl('');
            }
          } else {
            console.log('URL does not match expected format');
            setFileUrl('');
          }
        } else {
          // For other URLs (direct links, etc.), use as-is
          console.log('Using URL as-is');
          setFileUrl(file.url);
        }
      } catch (error) {
        console.error('Error processing file URL:', error);
        setFileUrl('');
      } finally {
        setLoading(false);
      }
    };

    getFileUrl();
  }, [file, isOpen]);

  if (!file) return null;

  const handleDownload = async () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="w-full h-[400px] border rounded-md flex items-center justify-center bg-muted">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Laddar...</p>
          </div>
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="w-full h-[400px] border rounded-md flex items-center justify-center bg-muted">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              {file.url === '#' || file.url === '' 
                ? 'Detta är en demo-fil. Förhandsvisning inte tillgänglig.' 
                : 'Kunde inte ladda filen'}
            </p>
            {file.url !== '#' && file.url !== '' && (
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Ladda ner för att visa
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (file.type === 'pdf' || file.type === 'warranty' || file.type === 'inspection') {
      return (
        <div className="w-full h-[600px] border rounded-md flex flex-col">
          <div className="p-4 bg-blue-50 border-b border-blue-200 rounded-t-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800 font-medium">PDF-förhandsvisning</p>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Öppna i ny flik
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-4 p-8">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">PDF-dokument</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Webbläsare blockerar ofta PDF-förhandsvisning av säkerhetsskäl
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => window.open(fileUrl, '_blank')} 
                    className="w-full"
                    disabled={!fileUrl}
                  >
                    Öppna i ny flik
                  </Button>
                  <Button 
                    onClick={handleDownload} 
                    variant="outline" 
                    className="w-full"
                    disabled={!fileUrl}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Ladda ner fil
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (file.type === 'photo') {
      return (
        <div className="w-full max-h-[600px] overflow-auto">
          <img
            src={fileUrl}
            alt={file.name}
            className="w-full h-auto rounded-md"
          />
        </div>
      );
    }

    return (
      <div className="w-full h-[400px] border rounded-md flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Förhandsvisning inte tillgänglig för denna filtyp</p>
          <p className="text-xs text-muted-foreground">
            Webbläsaren kan blockera vissa PDF-filer av säkerhetsskäl
          </p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Ladda ner för att visa
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex-1 pr-4">{file.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm" disabled={!fileUrl}>
                <Download className="w-4 h-4 mr-1" />
                Ladda ner
              </Button>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Förhandsgranskning av {file.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {file.description && (
            <div className="text-sm text-muted-foreground">
              {file.description}
            </div>
          )}
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            <p className="font-medium">Tips:</p>
            <p>Om förhandsvisningen inte fungerar kan du ladda ner filen för att öppna den lokalt.</p>
          </div>
          
          {renderPreview()}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Uppladdad: {new Date(file.uploadedAt).toLocaleDateString()}</span>
            <span>Av: {file.uploadedBy}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}