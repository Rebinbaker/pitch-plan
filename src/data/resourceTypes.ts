import { Truck, Store, Zap, Wrench, Sun, Hammer, Paintbrush, Container, Building2, MoreHorizontal, type LucideIcon } from 'lucide-react';

export interface ResourceTypeConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string; // tailwind classes for badge
}

export const RESOURCE_TYPES: ResourceTypeConfig[] = [
  { value: 'transporter', label: 'Transportör', icon: Truck, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  { value: 'supplier', label: 'Byggvaruhus', icon: Store, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  { value: 'electrician', label: 'Elektriker', icon: Zap, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' },
  { value: 'plumber', label: 'Rörmokare', icon: Wrench, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' },
  { value: 'solar', label: 'Solcellsmontör', icon: Sun, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' },
  { value: 'tinsmith', label: 'Plåtslagare', icon: Hammer, color: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
  { value: 'painter', label: 'Målare', icon: Paintbrush, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200' },
  { value: 'container', label: 'Container', icon: Container, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  { value: 'scaffolding', label: 'Ställning', icon: Building2, color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' },
  { value: 'other', label: 'Annat', icon: MoreHorizontal, color: 'bg-muted text-muted-foreground' },
];

export const getResourceTypeConfig = (value: string): ResourceTypeConfig =>
  RESOURCE_TYPES.find((t) => t.value === value) ?? RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
