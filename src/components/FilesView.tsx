import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Camera, Upload, Download, Eye, Search, X } from 'lucide-react';
import { ProjectFile, FileType } from '@/types/files';
import { Project } from '@/types/project';

interface FilesViewProps {
  files: ProjectFile[];
  projects: Project[];
  onUploadFile: (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => void;
  onDeleteFile: (fileId: string) => void;
}

export function FilesView({ files, projects, onUploadFile, onDeleteFile }: FilesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === 'all' || file.projectId === filterProject;
    const matchesType = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesProject && matchesType;
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
      case 'photo': return 'bg-green-500';
      case 'pdf': return 'bg-red-500';
      case 'inspection': return 'bg-blue-500';
      case 'warranty': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projektfiler & Inspektioner</h2>
          <p className="text-muted-foreground">Ladda upp och hantera projektdokumentation</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="shadow-primary">
              <Upload className="w-4 h-4" />
              Ladda upp fil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ladda upp ny fil</DialogTitle>
            </DialogHeader>
            <FileUploadForm
              projects={projects}
              onUpload={onUploadFile}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Sök filer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrera efter projekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla projekt</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterType} onValueChange={(value: FileType | 'all') => setFilterType(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filtyp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="photo">Foton</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="inspection">Inspektioner</SelectItem>
              <SelectItem value="warranty">Garantibevis</SelectItem>
              <SelectItem value="other">Övrigt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {files.filter(f => f.type === 'photo').length}
            </div>
            <div className="text-sm text-muted-foreground">Foton</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {files.filter(f => f.type === 'inspection').length}
            </div>
            <div className="text-sm text-muted-foreground">Inspektioner</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {files.filter(f => f.type === 'pdf').length}
            </div>
            <div className="text-sm text-muted-foreground">PDF-dokument</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {files.length}
            </div>
            <div className="text-sm text-muted-foreground">Totalt filer</div>
          </CardContent>
        </Card>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredFiles.map(file => {
          const FileIcon = getFileIcon(file.type);
          return (
            <Card key={file.id} className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg flex items-start gap-2 flex-1 min-w-0">
                    <FileIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span className="break-words leading-tight">{file.name}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`${getFileTypeColor(file.type)} text-white flex-shrink-0`}>
                      {file.type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteFile(file.id)}
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Projekt</div>
                  <div className="text-sm text-muted-foreground break-words">{getProjectName(file.projectId)}</div>
                </div>
                
                {file.description && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">Beskrivning</div>
                    <div className="text-sm text-muted-foreground break-words">{file.description}</div>
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Taggar</div>
                  <div className="flex flex-wrap gap-1">
                    {file.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground break-words">
                  Uppladdad: {new Date(file.uploadedAt).toLocaleDateString()} av {file.uploadedBy}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    Visa
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-1" />
                    Ladda ner
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Inga filer hittades som matchar dina kriterier.
          </div>
        </div>
      )}
    </div>
  );
}

interface FileUploadFormProps {
  projects: Project[];
  onUpload: (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => void;
}

function FileUploadForm({ projects, onUpload }: FileUploadFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'photo' as FileType,
    projectId: '',
    description: '',
    uploadedBy: 'Current User',
    tags: [] as string[],
    url: '#' // In real app, this would be the uploaded file URL
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.projectId) return;
    
    onUpload(formData);
    setFormData({
      name: '',
      type: 'photo',
      projectId: '',
      description: '',
      uploadedBy: 'Current User',
      tags: [],
      url: '#'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Filnamn</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ange filnamn"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Filtyp</label>
        <Select 
          value={formData.type} 
          onValueChange={(value: FileType) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="photo">Foto</SelectItem>
            <SelectItem value="pdf">PDF-dokument</SelectItem>
            <SelectItem value="inspection">Inspektionsrapport</SelectItem>
            <SelectItem value="other">Övrigt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium">Projekt</label>
        <Select 
          value={formData.projectId} 
          onValueChange={(value) => setFormData({ ...formData, projectId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Välj projekt" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium">Beskrivning (valfritt)</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Filbeskrivning"
        />
      </div>
      
      <Button type="submit" className="w-full">
        Ladda upp fil
      </Button>
    </form>
  );
}