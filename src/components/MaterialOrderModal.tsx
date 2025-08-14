import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MaterialOrderForm } from './MaterialOrderForm';
import { MaterialOrder, Project } from '@/types/project';
import { Package, Edit, Plus } from 'lucide-react';

interface MaterialOrderModalProps {
  project: Project;
  allProjects: Project[];
  onSave: (materialOrder: MaterialOrder) => void;
  children?: React.ReactNode;
  trigger?: 'button' | 'custom';
}

export function MaterialOrderModal({ 
  project, 
  allProjects, 
  onSave, 
  children, 
  trigger = 'button' 
}: MaterialOrderModalProps) {
  const hasExistingOrder = !!project.materialOrder;

  const triggerButton = trigger === 'button' ? (
    <Button variant="outline" size="sm">
      {hasExistingOrder ? (
        <>
          <Edit className="w-4 h-4 mr-2" />
          Redigera materialbeställning
        </>
      ) : (
        <>
          <Plus className="w-4 h-4 mr-2" />
          Skapa materialbeställning
        </>
      )}
    </Button>
  ) : children;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {hasExistingOrder ? 'Redigera materialbeställning' : 'Skapa materialbeställning'}
          </DialogTitle>
        </DialogHeader>
        <MaterialOrderForm
          project={project}
          allProjects={allProjects}
          onSave={onSave}
          onClose={() => {}}
        />
      </DialogContent>
    </Dialog>
  );
}