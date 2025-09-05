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
import { ScaffoldingTrailer, ScaffoldingStatus } from '@/types/scaffolding';
import { useToast } from '@/hooks/use-toast';

const scaffoldingSchema = z.object({
  name: z.string().min(1, 'Vagnnamn krävs'),
  description: z.string().optional(),
  status: z.enum(['Tillgänglig', 'I bruk', 'Under transport'] as const),
});

interface MobileAddScaffoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (trailer: ScaffoldingTrailer) => void;
}

export function MobileAddScaffoldingModal({ isOpen, onClose, onAdd }: MobileAddScaffoldingModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof scaffoldingSchema>>({
    resolver: zodResolver(scaffoldingSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'Tillgänglig',
    },
  });

  const onSubmit = async (values: z.infer<typeof scaffoldingSchema>) => {
    setIsSubmitting(true);
    
    try {
      const newTrailer: ScaffoldingTrailer = {
        id: Date.now().toString(),
        name: values.name,
        description: values.description || '',
        status: values.status,
        ownership: 'Egna ställningar', // Default value
        lastUpdated: new Date().toISOString(),
      };

      onAdd(newTrailer);
      
      toast({
        title: "Ställningsvagn skapad",
        description: `${values.name} har lagts till i systemet.`,
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error adding scaffolding trailer:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa ställningsvagn. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm mx-auto max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-lg">Ny Ställningsvagn</DialogTitle>
        </DialogHeader>
        
        <div className="px-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Vagnnamn</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="T.ex. Ställningsvagn 1"
                        className="h-10" 
                      />
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
                    <FormLabel className="text-sm font-medium">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Tillgänglig">Tillgänglig</SelectItem>
                        <SelectItem value="I bruk">I bruk</SelectItem>
                        <SelectItem value="Under transport">Under transport</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Beskrivning (frivilligt)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Beskrivning av vagnen, utrustning, etc..."
                        className="resize-none h-16"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

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
              {isSubmitting ? 'Sparar...' : 'Skapa Vagn'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}