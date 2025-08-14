import { Project, MaterialItem } from '@/types/project';
import { Notification } from '@/types/notification';

export interface LinkopingInventoryItem {
  id: string;
  materialType: string;
  customMaterialType?: string;
  totalSquareMeters: number;
  sourceProjects: Array<{
    projectId: string;
    projectName: string;
    amount: number;
    dateAdded: string;
  }>;
  lastUpdated: string;
}

export interface MaterialOrderReminder {
  availableMaterials: LinkopingInventoryItem[];
  totalValue: number;
  message: string;
}

/**
 * Samlar allt material som är lagrat i Linköpingsparken
 */
export function getLinkopingInventory(projects: Project[]): LinkopingInventoryItem[] {
  const inventory = new Map<string, LinkopingInventoryItem>();

  projects.forEach(project => {
    const material = project.avvaratMaterial;
    if (material?.plannedAction === 'Körs till Linköpingsparken' && material.materials) {
      material.materials.forEach(materialItem => {
        const materialType = materialItem.materialType === 'Annat' && materialItem.customMaterialType 
          ? materialItem.customMaterialType 
          : materialItem.materialType;

        const existingInventory = inventory.get(materialType);
        
        if (existingInventory) {
          existingInventory.totalSquareMeters += materialItem.squareMeters;
          existingInventory.sourceProjects.push({
            projectId: project.id,
            projectName: project.name,
            amount: materialItem.squareMeters,
            dateAdded: material.dateNoted || new Date().toISOString()
          });
          existingInventory.lastUpdated = new Date().toISOString();
        } else {
          inventory.set(materialType, {
            id: `inventory-${materialType}-${Date.now()}`,
            materialType,
            customMaterialType: materialItem.customMaterialType,
            totalSquareMeters: materialItem.squareMeters,
            sourceProjects: [{
              projectId: project.id,
              projectName: project.name,
              amount: materialItem.squareMeters,
              dateAdded: material.dateNoted || new Date().toISOString()
            }],
            lastUpdated: new Date().toISOString()
          });
        }
      });
    }
  });

  return Array.from(inventory.values()).sort((a, b) => a.materialType.localeCompare(b.materialType));
}

/**
 * Genererar påminnelse om tillgängligt material för materialbeställning
 */
export function generateMaterialOrderReminder(projects: Project[]): MaterialOrderReminder {
  const inventory = getLinkopingInventory(projects);
  
  if (inventory.length === 0) {
    return {
      availableMaterials: [],
      totalValue: 0,
      message: "Inget material finns tillgängligt i Linköpingsparken."
    };
  }

  const materialSummary = inventory.map(item => 
    `${item.totalSquareMeters} m² ${item.materialType}`
  ).join(', ');

  const message = `⚠️ VIKTIGT: Tillgängligt material från Linköpingsparken: ${materialSummary}. Kontrollera detta innan materialbeställning för att undvika onödiga kostnader.`;

  return {
    availableMaterials: inventory,
    totalValue: inventory.reduce((sum, item) => sum + item.totalSquareMeters, 0),
    message
  };
}

/**
 * Föreslår smart allokering av material från Linköping till nytt projekt
 */
export function suggestMaterialAllocation(
  newProject: Project, 
  projects: Project[]
): { suggestions: Array<{ material: LinkopingInventoryItem; recommendedAmount: number }>, message: string } {
  const inventory = getLinkopingInventory(projects);
  
  if (inventory.length === 0) {
    return {
      suggestions: [],
      message: "Inget material finns tillgängligt i Linköpingsparken för allokering."
    };
  }

  // Enkel matchning baserat på materialtyp - kan utökas med mer intelligent logik
  const suggestions = inventory.map(item => ({
    material: item,
    recommendedAmount: Math.min(item.totalSquareMeters, 100) // Föreslå max 100 m² eller allt som finns
  }));

  const message = suggestions.length > 0 
    ? `💡 Förslag: Material från Linköpingsparken kan användas för projektet "${newProject.name}".`
    : "Inget lämpligt material hittades i Linköpingsparken för detta projekt.";

  return { suggestions, message };
}

/**
 * Skapar notifikation för tillgängligt material vid materialbeställning
 */
export function createMaterialOrderNotification(
  project: Project,
  reminder: MaterialOrderReminder
): Notification {
  return {
    id: `material-reminder-${project.id}-${Date.now()}`,
    type: 'material_order',
    category: 'general',
    priority: reminder.availableMaterials.length > 0 ? 'high' : 'low',
    title: 'Kontrollera tillgängligt material innan beställning',
    message: reminder.message,
    projectId: project.id,
    projectName: project.name,
    createdAt: new Date().toISOString(),
    isRead: false,
    actionRequired: reminder.availableMaterials.length > 0
  };
}

/**
 * Beräknar värde av material i Linköpingsparken (enkel uppskattning)
 */
export function calculateInventoryValue(inventory: LinkopingInventoryItem[]): number {
  // Enkla uppskattningar per materialtyp (SEK per m²)
  const materialValues: { [key: string]: number } = {
    'Takpannor': 150,
    'Underlagsduk': 25,
    'Läkt': 45,
    'Plåtdetaljer': 200,
    'Isolering': 80,
    'Annat': 50
  };

  return inventory.reduce((total, item) => {
    const valuePerSquareMeter = materialValues[item.materialType] || materialValues['Annat'];
    return total + (item.totalSquareMeters * valuePerSquareMeter);
  }, 0);
}

/**
 * Hittar material som legat för länge i Linköping (över 60 dagar)
 */
export function getStaleInventory(inventory: LinkopingInventoryItem[]): LinkopingInventoryItem[] {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  return inventory.filter(item => {
    const oldestProject = item.sourceProjects.reduce((oldest, project) => {
      const projectDate = new Date(project.dateAdded);
      return projectDate < oldest ? projectDate : oldest;
    }, new Date());

    return oldestProject < sixtyDaysAgo;
  });
}