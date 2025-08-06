export type FileType = 'photo' | 'pdf' | 'inspection' | 'other';

export interface ProjectFile {
  id: string;
  name: string;
  type: FileType;
  url: string;
  projectId: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  tags: string[];
}