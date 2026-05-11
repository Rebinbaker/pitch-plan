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
import { weekNumberToDate, calculateDeadlineFromWorkDays } from '@/utils/weekCalculations';
import { dateToWeekString, calculatePlannedStartDate, calculateBeraknatSlutDatum, migrateProjectToNewPlanning } from '@/utils/projectPlanning';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  address: z.string().min(1, 'Address is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  responsibleSeller: z.string().min(1, 'Responsible seller is required'),
  constructionStartWeek: z.string().min(1, 'Construction start week is required'),
  estimatedWorkDays: z.number().min(1, 'Estimated work days is required'),
  rotStatus: z.enum(['Yes', 'No'] as const),
  status: z.enum(['planned', 'ongoing', 'completed', 'invoiced', 'ånger'] as const),
  region: z.string().min(1, 'Region is required'),
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
      constructionStartWeek: '',
      estimatedWorkDays: 7,
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
        constructionStartWeek: project.constructionStartWeek || '',
        estimatedWorkDays: project.estimatedWorkDays || 7,
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
        constructionStartWeek: '',
        estimatedWorkDays: 7,
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
      // Calculate dates from week input — handle "v32", "32", or "2026-W32"
      const isoMatch = data.constructionStartWeek.match(/^(\d{4})-W(\d+)$/i);
      let yearForWeek = new Date().getFullYear();
      let weekNum: string;
      if (isoMatch) {
        yearForWeek = parseInt(isoMatch[1], 10);
        const raw = parseInt(isoMatch[2], 10);
        weekNum = String(raw > 53 ? parseInt(isoMatch[2].slice(-2), 10) : raw);
      } else {
        weekNum = data.constructionStartWeek.replace(/[^0-9]/g, '');
      }
      const byggStartVecka = `${yearForWeek}-W${weekNum.padStart(2, '0')}`;

      const startDate = weekNumberToDate(data.constructionStartWeek);
      const deadline = calculateDeadlineFromWorkDays(startDate, data.estimatedWorkDays);
      const planeradStartDatum = calculatePlannedStartDate(byggStartVecka);

      if (isEditing && project && onUpdateProject) {
        // Update existing project - migrate to new planning structure
        let updatedProject: Project = {
          ...project,
          name: data.name,
          address: data.address,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          responsibleSeller: data.responsibleSeller,
          constructionStartWeek: data.constructionStartWeek,
          estimatedWorkDays: data.estimatedWorkDays,
          startDate,
          deadline,
          rotStatus: data.rotStatus,
          status: data.status,
          region: data.region,
          notes: data.notes || '',
        };
        
        // Apply migration to ensure new planning fields are populated
        updatedProject = migrateProjectToNewPlanning(updatedProject);

        onUpdateProject(updatedProject);
        
        toast({
          title: 'Projekt uppdaterat framgångsrikt',
          description: `${updatedProject.name} har uppdaterats.`,
        });
      } else {
        // Create new project with new planning fields from the start
        const projectId = `project-${Date.now()}`;
        const baseProject: Project = {
          id: projectId,
          name: data.name,
          address: data.address,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          responsibleSeller: data.responsibleSeller,
          constructionStartWeek: data.constructionStartWeek,
          estimatedWorkDays: data.estimatedWorkDays,
          startDate,
          deadline,
          rotStatus: data.rotStatus,
          status: data.status,
          region: data.region,
          notes: data.notes || '',
          
          // New planning fields
          bygg_start_vecka: byggStartVecka,
          planerad_start_datum: planeradStartDatum,
          ungefärlig_arbetstid_dagar: data.estimatedWorkDays,
          
          checklist: defaultChecklist.map((item, index) => ({
            ...item,
            id: `checklist-${projectId}-${index}`,
          })),
          workPhases: defaultWorkPhases.map((item, index) => ({
            ...item,
            id: `workphase-${projectId}-${index}`,
            completed: false,
            completedAt: undefined,
            imagesReceived: false,
            inspectionConfirmed: false,
            comment: undefined,
            lastReminderSent: undefined,
          })),
          completionPercentage: 0,
        };
        
        // Calculate beräknat_slut_datum after all fields are set
        const newProject: Project = {
          ...baseProject,
          beräknat_slut_datum: calculateBeraknatSlutDatum(baseProject)
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
                name="constructionStartWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Byggstart (vecka)</FormLabel>
                    <FormControl>
                      <Input placeholder="t.ex. v31" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="estimatedWorkDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ungefärlig arbetstid (dagar)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="365"
                      placeholder="6-10"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <SelectItem value="ånger">Ånger</SelectItem>
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