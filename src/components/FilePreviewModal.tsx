import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { ProjectFile } from '@/types/files';

interface FilePreviewModalProps {
  file: ProjectFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ file, isOpen, onClose }: FilePreviewModalProps) {
  if (!file) return null;

  const handleDownload = () => {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreview = () => {
    if (file.type === 'pdf' || file.type === 'warranty' || file.type === 'inspection') {
      return (
        <div className="w-full h-[600px] border rounded-md">
          <iframe
            src={file.url}
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
            src={file.url}
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
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Ladda ner
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm" className="h-6 w-6 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
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