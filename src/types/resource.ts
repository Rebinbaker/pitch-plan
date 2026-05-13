export interface Resource {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  company?: string | null;
  resourceTypes: string[];
  counties: string[];
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  website?: string | null;
  notes?: string | null;
  isFavorite: boolean;
  rating?: number | null;
  timesUsed: number;
  createdAt: string;
  updatedAt: string;
}

export type ResourceInput = Omit<
  Resource,
  'id' | 'organizationId' | 'userId' | 'createdAt' | 'updatedAt' | 'timesUsed'
> & { timesUsed?: number };
