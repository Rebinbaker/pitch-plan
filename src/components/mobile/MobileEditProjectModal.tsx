import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Project, ProjectStatus } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const editProjectSchema = z.object({
  name: z.string().min(1, 'Projektnamn krävs'),
  customerName: z.string().min(1, 'Kundnamn krävs'),
  customerPhone: z.string().min(1, 'Telefonnummer krävs'),
  address: z.string().optional(),
  status: z.enum(['planned', 'ongoing', 'completed', 'invoiced', 'ånger'] as const),
  completion_percentage: z.number().min(0).max(100),
  construction_team: z.string().optional(),
  scaffolding_team_id: z.string().optional(),
  assigned_trailer: z.string().optional(),
  notes: z.string().optional(),
});

interface MobileEditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdate: (project: Project) => void;
  teams: any[];
  trailers: any[];
}

export function MobileEditProjectModal({ 
  isOpen, 
  onClose, 
  project, 
  onUpdate, 
  teams, 
  trailers 
}: MobileEditProjectModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof editProjectSchema>>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: project.name || '',
      customerName: project.customerName || '',
      customerPhone: project.customerPhone || '',
      address: project.address || '',
      status: project.status,
      completion_percentage: project.completionPercentage || 0,
      construction_team: project.constructionTeam || '',
      scaffolding_team_id: project.scaffoldingTeamId || '',
      assigned_trailer: project.assignedTrailer || '',
      notes: project.notes || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof editProjectSchema>) => {
    setIsSubmitting(true);
    
    try {
      const updatedProject: Project = {
        ...project,
        name: values.name,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        address: values.address || '',
        status: values.status,
        completionPercentage: values.completion_percentage,
        constructionTeam: values.construction_team || '',
        scaffoldingTeamId: values.scaffolding_team_id || '',
        assignedTrailer: values.assigned_trailer || '',
        notes: values.notes || '',
      };

      onUpdate(updatedProject);
      
      toast({
        title: "Projekt uppdaterat",
        description: `${values.name} har uppdaterats.`,
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera projekt. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'Planerat';
      case 'ongoing': return 'Pågående';
      case 'completed': return 'Avslutat';
      case 'invoiced': return 'Fakturerat';
      default: return status;
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'planned': return 'bg-orange-100 text-orange-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'invoiced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm mx-auto max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg">Redigera Projekt</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Projektnamn</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Projektnamn" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Adress</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Projektadress" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Kundinfo</h4>
                
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Kundnamn</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Kundens namn" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="070-123 45 67" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Status & Progress */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Status & Framsteg</h4>
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center gap-2">
                        Status
                        <Badge className={getStatusColor(field.value)}>
                          {getStatusLabel(field.value)}
                        </Badge>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planned">Planerat</SelectItem>
                          <SelectItem value="ongoing">Pågående</SelectItem>
                          <SelectItem value="completed">Avslutat</SelectItem>
                          <SelectItem value="invoiced">Fakturerat</SelectItem>
                          <SelectItem value="ånger">Ånger</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="completion_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm flex items-center justify-between">
                        Framsteg
                        <span className="text-primary font-medium">{field.value}%</span>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          value={[field.value]}
                          onValueChange={(values) => field.onChange(values[0])}
                          max={100}
                          step={5}
                          className="py-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Assignments */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Tilldelningar</h4>
                
                {teams.length > 0 && (
                  <FormField
                    control={form.control}
                    name="construction_team"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Team</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Välj team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Inget team</SelectItem>
                            {teams.filter((team) => team.type !== 'Säljare' && team.type !== 'Ställningsmontör').map((team) => (
                              <SelectItem key={team.id} value={team.name}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {teams.filter((t) => t.type === 'Ställningsmontör').length > 0 && (
                  <FormField
                    control={form.control}
                    name="scaffolding_team_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Ställningsteam</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Välj ställningsteam" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Inget ställningsteam</SelectItem>
                            {teams.filter((t) => t.type === 'Ställningsmontör').map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {trailers.length > 0 && (
                  <FormField
                    control={form.control}
                    name="assigned_trailer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Ställningsvagn</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Välj vagn" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Ingen vagn</SelectItem>
                            {trailers.map((trailer) => (
                              <SelectItem key={trailer.id} value={trailer.name}>
                                {trailer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Anteckningar</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Projektanteckningar..."
                        className="resize-none h-20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <div className="p-4 pt-2 border-t">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={isSubmitting}
            >
              Avbryt
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}