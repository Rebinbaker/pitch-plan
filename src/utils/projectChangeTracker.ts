import { Project } from '@/types/project';
import { Notification } from '@/types/notification';
import { differenceInDays, parseISO } from 'date-fns';
import { weekNumberToDate } from '@/utils/weekCalculations';

// Define trackable fields with their Swedish display names
const TRACKABLE_FIELDS: Record<keyof Project, string> = {
  name: 'Projektnamn',
  address: 'Adress',
  customerName: 'Kundnamn',
  customerPhone: 'Telefonnummer',
  customerEmail: 'E-post',
  constructionStartWeek: 'Planerad byggstartsvecka',
  actualConstructionStart: 'Faktisk byggstart',
  deadline: 'Deadline',
  estimatedWorkDays: 'Beräknade arbetsdagar',
  status: 'Status',
  completionPercentage: 'Slutförandeprocent',
  assignedTrailer: 'Tilldelad släpvagn',
  constructionTeam: 'Byggteam',
  notes: 'Anteckningar',
  rotStatus: 'ROT-status',
  rotPercentage: 'ROT-procent'
} as any;

// Fields that should trigger delay detection
const DELAY_SENSITIVE_FIELDS = ['constructionStartWeek', 'actualConstructionStart', 'deadline'];

// Current user - in a real app this would come from auth context
const getCurrentUser = () => {
  // For now, return a default user. In production, this should come from authentication
  return {
    name: 'Nuvarande användare',
    id: 'current-user-id'
  };
};

// Format field values for display
const formatFieldValue = (field: string, value: any): string => {
  if (value === null || value === undefined) return 'Ej angiven';
  
  switch (field) {
    case 'actualConstructionStart':
    case 'deadline':
      return value ? new Date(value).toLocaleDateString('sv-SE') : 'Ej angiven';
    case 'status':
      const statusMap: Record<string, string> = {
        'planned': 'Planerad',
        'ongoing': 'Pågående', 
        'completed': 'Klar',
        'invoiced': 'Fakturerad'
      };
      return statusMap[value] || value;
    case 'rotStatus':
      return value === 'Yes' ? 'Ja' : value === 'No' ? 'Nej' : value;
    case 'completionPercentage':
      return `${value}%`;
    case 'estimatedWorkDays':
      return `${value} dagar`;
    case 'rotPercentage':
      return `${value}%`;
    default:
      return String(value);
  }
};

// Generate field change notification
export const generateFieldChangeNotification = (
  project: Project,
  fieldName: keyof Project,
  oldValue: any,
  newValue: any
): Notification => {
  const user = getCurrentUser();
  const fieldDisplayName = TRACKABLE_FIELDS[fieldName] || fieldName;
  const formattedOldValue = formatFieldValue(fieldName, oldValue);
  const formattedNewValue = formatFieldValue(fieldName, newValue);

  return {
    id: `change-${project.id}-${fieldName}-${Date.now()}`,
    type: 'field_change',
    priority: DELAY_SENSITIVE_FIELDS.includes(fieldName) ? 'high' : 'medium',
    title: `Projektändring: ${fieldDisplayName}`,
    message: `${fieldDisplayName} ändrades från "${formattedOldValue}" till "${formattedNewValue}" av ${user.name}`,
    projectId: project.id,
    projectName: project.name,
    createdAt: new Date().toISOString(),
    isRead: false,
    actionRequired: false,
    fieldChanged: fieldDisplayName,
    oldValue: formattedOldValue,
    newValue: formattedNewValue,
    changedBy: user.name,
    changeType: 'manual_change'
  };
};

// Detect passive delays (when actual start is later than planned without manual rescheduling)
export const detectPassiveDelay = (
  project: Project,
  previousProject?: Project
): Notification | null => {
  // Only check if we have both planned and actual start dates
  if (!project.constructionStartWeek || !project.actualConstructionStart) {
    return null;
  }

  try {
    const plannedStartDate = parseISO(weekNumberToDate(project.constructionStartWeek));
    const actualStartDate = parseISO(project.actualConstructionStart);
    const delayDays = differenceInDays(actualStartDate, plannedStartDate);

    // Only create notification if there's a delay and this is the first time we're detecting it
    if (delayDays > 0) {
      // Check if this is a new delay (either no previous project or the delay wasn't there before)
      const isNewDelay = !previousProject || 
        !previousProject.actualConstructionStart ||
        differenceInDays(
          parseISO(previousProject.actualConstructionStart),
          parseISO(weekNumberToDate(previousProject.constructionStartWeek || project.constructionStartWeek))
        ) <= 0;

      if (isNewDelay) {
        const delayWeeks = Math.ceil(delayDays / 7);
        
        return {
          id: `delay-${project.id}-${Date.now()}`,
          type: 'passive_delay',
          priority: delayDays > 7 ? 'urgent' : 'high',
          title: `Passiv försening: ${project.name}`,
          message: `Projektet startade ${delayDays} dag${delayDays > 1 ? 'ar' : ''} (${delayWeeks} vecka${delayWeeks > 1 ? 'r' : ''}) senare än planerat. Planerad start: ${project.constructionStartWeek}, Faktisk start: ${actualStartDate.toLocaleDateString('sv-SE')}`,
          projectId: project.id,
          projectName: project.name,
          createdAt: new Date().toISOString(),
          isRead: false,
          actionRequired: true,
          fieldChanged: 'Byggstart',
          oldValue: project.constructionStartWeek,
          newValue: actualStartDate.toLocaleDateString('sv-SE'),
          changedBy: 'System',
          changeType: 'passive_delay'
        };
      }
    }
  } catch (error) {
    console.error('Error detecting passive delay:', error);
  }

  return null;
};

// Track all changes between two project versions
export const trackProjectChanges = (
  newProject: Project,
  oldProject: Project
): Notification[] => {
  const notifications: Notification[] = [];

  // Check each trackable field for changes
  Object.keys(TRACKABLE_FIELDS).forEach((field) => {
    const fieldKey = field as keyof Project;
    const oldValue = oldProject[fieldKey];
    const newValue = newProject[fieldKey];

    // Skip if values are the same (including null/undefined equality)
    if (oldValue === newValue) return;

    // Skip if both are falsy (null, undefined, empty string)
    if (!oldValue && !newValue) return;

    // Generate field change notification
    const notification = generateFieldChangeNotification(
      newProject,
      fieldKey,
      oldValue,
      newValue
    );
    notifications.push(notification);
  });

  // Check for passive delays
  const delayNotification = detectPassiveDelay(newProject, oldProject);
  if (delayNotification) {
    notifications.push(delayNotification);
  }

  return notifications;
};

// Helper function to get notification type icon and label in Swedish
export const getNotificationTypeInfo = (type: string) => {
  switch (type) {
    case 'field_change':
      return { icon: 'Edit', label: 'Manuell ändring' };
    case 'passive_delay':
      return { icon: 'AlertTriangle', label: 'Passiv försening' };
    case 'project_rescheduled':
      return { icon: 'Calendar', label: 'Projektomschemaläggning' };
    case 'material_order':
      return { icon: 'Package', label: 'Materialbeställning' };
    case 'checklist_incomplete':
      return { icon: 'CheckSquare', label: 'Ofullständig checklista' };
    case 'inspection_missing':
      return { icon: 'Search', label: 'Saknad inspektion' };
    case 'deadline_warning':
      return { icon: 'Clock', label: 'Deadline-varning' };
    default:
      return { icon: 'Bell', label: 'Meddelande' };
  }
};