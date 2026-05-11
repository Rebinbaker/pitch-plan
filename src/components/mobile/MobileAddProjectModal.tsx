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
import { Project, ProjectStatus, Region, ROTStatus, defaultChecklist, defaultWorkPhases } from '@/types/project';
import { RegionSelect } from '@/components/RegionSelect';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const quickProjectSchema = z.object({
  name: z.string().min(1, 'Projektnamn krävs'),
  address: z.string().min(1, 'Adress krävs'),
  customerName: z.string().min(1, 'Kundnamn krävs'),
  customerPhone: z.string().min(1, 'Telefonnummer krävs'),
  responsibleSeller: z.string().min(1, 'Ansvarig säljare krävs'),
  constructionStartWeek: z.string().min(1, 'Startvecka krävs'),
  estimatedWorkDays: z.number().min(1, 'Antal arbetsdagar krävs'),
  rotStatus: z.enum(['Yes', 'No'] as const),
  region: z.string().min(1, 'Region krävs'),
  notes: z.string().optional(),
});

interface MobileAddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: Project) => void;
  teams: any[];
}

export function MobileAddProjectModal({ isOpen, onClose, onAddProject, teams }: MobileAddProjectModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof quickProjectSchema>>({
    resolver: zodResolver(quickProjectSchema),
    defaultValues: {
      name: '',
      address: '',
      customerName: '',
      customerPhone: '',
      responsibleSeller: '',
      constructionStartWeek: '',
      estimatedWorkDays: 5,
      rotStatus: 'No',
      region: '',
      notes: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof quickProjectSchema>) => {
    setIsSubmitting(true);
    
    try {
      const newProject: Project = {
        id: Date.now().toString(),
        name: values.name,
        address: values.address,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        responsibleSeller: values.responsibleSeller,
        constructionStartWeek: values.constructionStartWeek,
        estimatedWorkDays: values.estimatedWorkDays,
        rotStatus: values.rotStatus,
        status: 'planned' as ProjectStatus,
        region: values.region,
        notes: values.notes || '',
        completionPercentage: 0,
        checklist: [...defaultChecklist.map(item => ({ ...item, id: `${Date.now()}-${Math.random()}` }))],
        workPhases: [...defaultWorkPhases.map(phase => ({ ...phase, id: `${Date.now()}-${Math.random()}` }))],
        activityLog: [],
        startDate: '',
        deadline: '',
      };

      onAddProject(newProject);
      
      toast({
        title: "Projekt skapat",
        description: `${values.name} har lagts till i systemet.`,
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa projekt. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm mx-auto max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg">Nytt Projekt</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Essential Info */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Projektnamn</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="T.ex. Takomläggning Villa" className="h-10" />
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
                      <FormLabel className="text-sm font-medium">Adress</FormLabel>
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

              {/* Project Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Projektdetaljer</h4>
                
                <FormField
                  control={form.control}
                  name="responsibleSeller"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Ansvarig säljare</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Säljarens namn" className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="constructionStartWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Startvecka</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="2024-45" className="h-10 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimatedWorkDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Arbetsdagar</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="5"
                            className="h-10 text-sm"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Region</FormLabel>
                        <FormControl>
                          <RegionSelect
                            value={field.value}
                            onChange={field.onChange}
                            triggerClassName="h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rotStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">ROT-avdrag</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="No">Nej</SelectItem>
                            <SelectItem value="Yes">Ja</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Anteckningar</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Frivilliga anteckningar..."
                          className="resize-none h-16"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              {isSubmitting ? 'Sparar...' : 'Skapa Projekt'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}