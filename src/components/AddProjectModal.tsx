import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Project, ProjectStatus, Region, ROTStatus, defaultChecklist, defaultWorkPhases } from '@/types/project';
import { useToast } from '@/hooks/use-toast';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  address: z.string().min(1, 'Address is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  responsibleSeller: z.string().min(1, 'Responsible seller is required'),
  constructionTeam: z.string().min(1, 'Construction team is required'),
  startDate: z.string().min(1, 'Start date is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  rotStatus: z.enum(['Yes', 'No'] as const),
  status: z.enum(['planned', 'ongoing', 'completed', 'invoiced'] as const),
  region: z.enum(['Stockholm', 'Västra Götaland'] as const),
  notes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: Project) => void;
  project?: Project; // Optional project for editing
  onUpdateProject?: (project: Project) => void; // Optional update handler
  teams?: any[]; // Teams data to get sellers from
}

const teams = [
  'Team Alpha',
  'Team Beta',
  'Team Gamma',
  'Team Delta',
  'Team Epsilon',
];

export function AddProjectModal({ isOpen, onClose, onAddProject, project, onUpdateProject, teams: teamsData = [] }: AddProjectModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      address: '',
      customerName: '',
      customerPhone: '',
      responsibleSeller: '',
      constructionTeam: '',
      startDate: '',
      deadline: '',
      rotStatus: 'No',
      status: 'planned',
      region: 'Stockholm',
      notes: '',
    },
  });

  // Watch the region field to filter sellers
  const selectedRegion = form.watch('region');
  
  // Get all sellers from teams data (both from regular teams and from "Säljare" type teams)
  const allSellers = teamsData.flatMap(team => team.sellers || []);
  const availableSellers = allSellers.filter(seller => seller.region === selectedRegion);



  // Reset form when project prop changes (for editing)
  React.useEffect(() => {
    if (project && isEditing) {
      form.reset({
        name: project.name,
        address: project.address,
        customerName: project.customerName,
        customerPhone: project.customerPhone,
        responsibleSeller: project.responsibleSeller,
        constructionTeam: project.constructionTeam,
        startDate: project.startDate,
        deadline: project.deadline,
        rotStatus: project.rotStatus,
        status: project.status,
        region: project.region,
        notes: project.notes || '',
      });
    } else if (!isEditing) {
      form.reset({
        name: '',
        address: '',
        customerName: '',
        customerPhone: '',
        responsibleSeller: '',
        constructionTeam: '',
        startDate: '',
        deadline: '',
        rotStatus: 'No',
        status: 'planned',
        region: 'Stockholm',
        notes: '',
      });
    }
  }, [project, isEditing, form]);

  // Clear seller selection when region changes
  React.useEffect(() => {
    const currentSeller = form.getValues('responsibleSeller');
    const isSellerValidForRegion = availableSellers.some(seller => `${seller.firstName} ${seller.lastName}` === currentSeller);
    
    if (currentSeller && !isSellerValidForRegion) {
      form.setValue('responsibleSeller', '');
    }
  }, [selectedRegion, form, availableSellers]);

  const onSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && project && onUpdateProject) {
        // Update existing project
        const updatedProject: Project = {
          ...project,
          name: data.name,
          address: data.address,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          responsibleSeller: data.responsibleSeller,
          constructionTeam: data.constructionTeam,
          startDate: data.startDate,
          deadline: data.deadline,
          rotStatus: data.rotStatus,
          status: data.status,
          region: data.region,
          notes: data.notes || '',
        };

        onUpdateProject(updatedProject);
        
        toast({
          title: 'Projekt uppdaterat framgångsrikt',
          description: `${updatedProject.name} har uppdaterats.`,
        });
      } else {
        // Create new project
        const newProject: Project = {
          id: `project-${Date.now()}`,
          name: data.name,
          address: data.address,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          responsibleSeller: data.responsibleSeller,
          constructionTeam: data.constructionTeam,
          startDate: data.startDate,
          deadline: data.deadline,
          rotStatus: data.rotStatus,
          status: data.status,
          region: data.region,
          notes: data.notes || '',
          checklist: defaultChecklist.map((item, index) => ({
            ...item,
            id: `checklist-${Date.now()}-${index}`,
          })),
          workPhases: defaultWorkPhases.map((item, index) => ({
            ...item,
            id: `workphase-${Date.now()}-${index}`,
          })),
          completionPercentage: 0,
        };

        onAddProject(newProject);
        
        toast({
          title: 'Projekt skapat framgångsrikt',
          description: `${newProject.name} har lagts till i dina projekt.`,
        });
      }

      form.reset();
      onClose();
    } catch (error) {
      toast({
        title: isEditing ? 'Fel vid uppdatering av projekt' : 'Fel vid skapande av projekt',
        description: isEditing ? 'Det uppstod ett fel vid uppdateringen av projektet. Försök igen.' : 'Det uppstod ett fel vid skapandet av projektet. Försök igen.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Redigera projekt' : 'Lägg till nytt projekt'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Uppdatera projektets detaljer.' : 'Skapa ett nytt byggprojekt med alla nödvändiga detaljer.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projektnamn</FormLabel>
                    <FormControl>
                      <Input placeholder="Ange projektnamn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Stockholm">Stockholm</SelectItem>
                        <SelectItem value="Västra Götaland">Västra Götaland</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adress</FormLabel>
                  <FormControl>
                    <Input placeholder="Ange projektadress" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kundnamn</FormLabel>
                    <FormControl>
                      <Input placeholder="Ange kundnamn" {...field} />
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
                    <FormLabel>Kundtelefon</FormLabel>
                    <FormControl>
                      <Input placeholder="Ange telefonnummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="responsibleSeller"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ansvarig säljare</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj säljare" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                         {availableSellers.length > 0 ? (
                           availableSellers.map((seller) => (
                             <SelectItem key={seller.id} value={`${seller.firstName} ${seller.lastName}`}>
                               {seller.firstName} {seller.lastName}
                             </SelectItem>
                           ))
                         ) : (
                           <SelectItem value="no-sellers-available" disabled>
                             Inga säljare tillgängliga för {selectedRegion}
                           </SelectItem>
                         )}
                       </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="constructionTeam"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Byggteam</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team} value={team}>
                            {team}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Startdatum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planned">Planerad</SelectItem>
                        <SelectItem value="ongoing">Pågående</SelectItem>
                        <SelectItem value="completed">Slutförd</SelectItem>
                        <SelectItem value="invoiced">Fakturerad</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rotStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ROT-avdrag</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj ROT-status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Yes">Ja</SelectItem>
                      <SelectItem value="No">Nej</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Om detta projekt kvalificerar för ROT-skatteavdrag
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anteckningar</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ange eventuella ytterligare anteckningar om projektet..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEditing ? 'Uppdaterar...' : 'Skapar...') : (isEditing ? 'Uppdatera projekt' : 'Skapa projekt')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}