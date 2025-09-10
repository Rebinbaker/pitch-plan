import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Camera, Upload, Download, Eye, Search, Plus, Filter } from 'lucide-react';
import { ProjectFile, FileType } from '@/types/files';
import { Project } from '@/types/project';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MobileFilesViewProps {
  files: ProjectFile[];
  projects: Project[];
  onUploadFile: (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => void;
  onDeleteFile: (fileId: string) => void;
}

export function MobileFilesView({ files, projects, onUploadFile, onDeleteFile }: MobileFilesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'photo': return Camera;
      case 'pdf': return FileText;
      case 'inspection': return FileText;
      case 'warranty': return FileText;
      default: return FileText;
    }
  };

  const getFileTypeColor = (type: FileType) => {
    switch (type) {
      case 'photo': return 'bg-success text-success-foreground';
      case 'pdf': return 'bg-destructive text-destructive-foreground';
      case 'inspection': return 'bg-info text-info-foreground';
      case 'warranty': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFileTypeLabel = (type: FileType) => {
    switch (type) {
      case 'photo': return 'Foto';
      case 'pdf': return 'PDF';
      case 'inspection': return 'Besiktning';
      case 'warranty': return 'Garanti';
      default: return type;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Filer</h2>
          <p className="text-sm text-muted-foreground">{filteredFiles.length} filer</p>
        </div>
        <Button size="sm" onClick={() => {}}>
          <Plus className="h-4 w-4 mr-1" />
          Ladda upp
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök filer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'photo', 'pdf', 'inspection', 'warranty'].map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type as FileType | 'all')}
            className="whitespace-nowrap"
          >
            {type === 'all' ? 'Alla' : getFileTypeLabel(type as FileType)}
          </Button>
        ))}
      </div>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Inga filer hittades</p>
            <Button onClick={() => {}}>
              <Upload className="h-4 w-4 mr-2" />
              Ladda upp första filen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.type);
            const project = projects.find(p => p.id === file.projectId);
            
            return (
              <Card key={file.id} className="hover:shadow-hover transition-shadow">
                <CardContent className="p-3">
                  {/* File Icon/Thumbnail */}
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-3">
                    {file.type === 'photo' && file.url ? (
                      <img 
                        src={file.url} 
                        alt={file.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project?.name || 'Inget projekt'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs ${getFileTypeColor(file.type)}`}>
                        {getFileTypeLabel(file.type)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(file.uploadedAt), 'dd MMM', { locale: sv })}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}