import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectChecklist } from './ProjectChecklist';
import { AvvaratMaterialSection } from './AvvaratMaterialSection';
import { Project } from '@/types/project';
import { 
  CalendarDays, 
  MapPin, 
  Phone, 
  User, 
  Users, 
  FileText, 
  Edit,
  ExternalLink,
  Download 
} from 'lucide-react';
import { downloadProjectReport } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  trailers?: any[];
}

export function ProjectDetailModal({ 
  project, 
  isOpen, 
  onClose, 
  onUpdateProject,
  trailers = []
}: ProjectDetailModalProps) {
  const { toast } = useToast();

  if (!project) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'planned';
      case 'ongoing': return 'ongoing';
      case 'completed': return 'completed';
      case 'invoiced': return 'invoiced';
      default: return 'default';
    }
  };

  const handleChecklistUpdate = (updatedChecklist: any[]) => {
    const completedCount = updatedChecklist.filter(item => item.completed).length;
    const completionPercentage = Math.round((completedCount / updatedChecklist.length) * 100);
    
    const updatedProject = {
      ...project,
      checklist: updatedChecklist,
      completionPercentage,
    };
    
    onUpdateProject(updatedProject);
  };

  const handleExportReport = async () => {
    try {
      const result = await downloadProjectReport(project, []);
      if (result.success) {
        toast({
          title: "Report Generated",
          description: `PDF report downloaded: ${result.fileName}`,
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to generate PDF report",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">
                {project.name}
              </DialogTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{project.address}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant={getStatusVariant(project.status)}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>
              {project.rotStatus === 'Yes' && (
                <Badge variant="rot">ROT</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.customerName}</p>
                      <p className="text-sm text-muted-foreground">Customer</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.customerPhone}</p>
                      <p className="text-sm text-muted-foreground">Phone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.constructionTeam}</p>
                      <p className="text-sm text-muted-foreground">Construction Team</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Timeline & Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{new Date(project.startDate).toLocaleDateString('sv-SE')}</p>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{new Date(project.deadline).toLocaleDateString('sv-SE')}</p>
                      <p className="text-sm text-muted-foreground">Deadline</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.responsibleSeller}</p>
                      <p className="text-sm text-muted-foreground">Responsible Seller</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Project Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Completion</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-4">
                  <div 
                    className="bg-gradient-primary h-4 rounded-full transition-smooth" 
                    style={{ width: `${project.completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            {project.notes && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Notes</h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{project.notes}</p>
                </div>
              </div>
            )}

            {/* Avvarat Material Section */}
            <AvvaratMaterialSection 
              project={project}
              onUpdateProject={onUpdateProject}
            />

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
                Edit Project
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
                View Location
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="w-4 h-4" />
                📄 Export Project Report
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="checklist">
            <ProjectChecklist 
              checklist={project.checklist}
              onChecklistUpdate={handleChecklistUpdate}
              startDate={project.startDate}
              project={project}
              trailers={trailers}
              onUpdateProject={onUpdateProject}
            />
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">File Management</h3>
              <p className="text-muted-foreground">
                File upload and management functionality will be available here.
              </p>
              <Button variant="outline" className="mt-4">
                Upload Files
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}