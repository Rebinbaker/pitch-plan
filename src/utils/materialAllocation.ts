import { Project, AllocatedMaterial } from '@/types/project';
import { Notification } from '@/types/notification';

export function allocateMaterialToProject(
  sourceProject: Project,
  targetProject: Project,
  allocatedBy: string = 'current-user'
): { updatedSourceProject: Project; updatedTargetProject: Project; notification: Notification } {
  
  if (!sourceProject.avvaratMaterial?.materials) {
    throw new Error('Källprojektet har inget material att allokera');
  }

  const allocation: AllocatedMaterial = {
    id: `allocation-${Date.now()}`,
    sourceProjectId: sourceProject.id,
    sourceProjectName: sourceProject.name,
    materials: [...sourceProject.avvaratMaterial.materials],
    allocatedAt: new Date().toISOString(),
    allocatedBy,
    notes: sourceProject.avvaratMaterial.comments || undefined
  };

  // Update source project - mark as allocated
  const updatedSourceProject: Project = {
    ...sourceProject,
    avvaratMaterial: {
      ...sourceProject.avvaratMaterial,
      allocatedToProjectId: targetProject.id,
      allocatedToProjectName: targetProject.name
    }
  };

  // Update target project - add allocated materials
  const updatedTargetProject: Project = {
    ...targetProject,
    allocatedMaterials: [
      ...(targetProject.allocatedMaterials || []),
      allocation
    ]
  };

  // Create notification for target project
  const notification: Notification = {
    id: `notification-${Date.now()}`,
    type: 'material_order',
    category: 'general',
    priority: 'medium',
    title: 'Material allokerat till ditt projekt',
    message: `Material från projekt "${sourceProject.name}" har allokerats till "${targetProject.name}". Kontrollera tillgängligt material innan materialbeställning.`,
    projectId: targetProject.id,
    projectName: targetProject.name,
    createdAt: new Date().toISOString(),
    isRead: false,
    actionRequired: true
  };

  return {
    updatedSourceProject,
    updatedTargetProject,
    notification
  };
}

export function getMaterialSummary(materials: AllocatedMaterial[]): string {
  const materialCounts = new Map<string, number>();
  
  materials.forEach(allocation => {
    allocation.materials.forEach(material => {
      const materialType = material.materialType === 'Annat' && material.customMaterialType 
        ? material.customMaterialType 
        : material.materialType;
      
      const current = materialCounts.get(materialType) || 0;
      materialCounts.set(materialType, current + material.squareMeters);
    });
  });

  const summaryParts: string[] = [];
  materialCounts.forEach((amount, type) => {
    summaryParts.push(`${amount} ${type}`);
  });

  return summaryParts.join(', ');
}

export function shouldShowMaterialReminder(project: Project): boolean {
  const hasAllocatedMaterials = (project.allocatedMaterials?.length || 0) > 0;
  const materialOrderItem = project.checklist?.find(item => item.label === 'Materialbeställning');
  const materialNotOrdered = !materialOrderItem?.completed;
  
  return hasAllocatedMaterials && materialNotOrdered;
}