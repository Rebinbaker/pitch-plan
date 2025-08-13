import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
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
        // Check if it's a Supabase storage URL
        if (file.url.includes('supabase') && file.url.includes('/storage/v1/object/')) {
          // Extract bucket and path from the URL
          // Expected format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
          const urlParts = file.url.split('/storage/v1/object/');
          if (urlParts.length > 1) {
            const pathWithPublic = urlParts[1];
            // Remove 'public/' prefix if it exists
            const pathParts = pathWithPublic.startsWith('public/') 
              ? pathWithPublic.substring(7).split('/') 
              : pathWithPublic.split('/');
            
            if (pathParts.length > 0) {
              const bucket = pathParts[0];
              const filePath = pathParts.slice(1).join('/');
              
              console.log('Trying to create signed URL for bucket:', bucket, 'path:', filePath);
              
              // Generate signed URL for private buckets
              const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 3600); // 1 hour expiry
              
              if (error) {
                console.error('Error creating signed URL:', error);
                setFileUrl(file.url); // Fallback to original URL
              } else {
                setFileUrl(data.signedUrl);
              }
            } else {
              setFileUrl(file.url);
            }
          } else {
            setFileUrl(file.url);
          }
        } else {
          setFileUrl(file.url);
        }
      } catch (error) {
        console.error('Error processing file URL:', error);
        setFileUrl(file.url);
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
            <p className="text-muted-foreground">Kunde inte ladda filen</p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Ladda ner för att visa
            </Button>
          </div>
        </div>
      );
    }

    if (file.type === 'pdf' || file.type === 'warranty' || file.type === 'inspection') {
      return (
        <div className="w-full h-[600px] border rounded-md">
          <iframe
            src={fileUrl}
            className="w-full h-full rounded-md"
            title={`Preview of ${file.name}`}
          />
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
              <Button onClick={onClose} variant="ghost" size="sm" className="h-6 w-6 p-0">
                <X className="w-4 h-4" />
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