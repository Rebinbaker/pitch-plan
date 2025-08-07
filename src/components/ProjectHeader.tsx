import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Filter } from 'lucide-react';
import { ProjectStatus, Region } from '@/types/project';

interface ProjectHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: ProjectStatus | 'all';
  onStatusFilterChange: (status: ProjectStatus | 'all') => void;
  regionFilter: Region | 'all';
  onRegionFilterChange: (region: Region | 'all') => void;
  onAddProject: () => void;
}

export function ProjectHeader({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  regionFilter,
  onRegionFilterChange,
  onAddProject,
}: ProjectHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/lovable-uploads/77f2bb38-c679-4daf-b9ae-070c12f7a608.png" 
            alt="Lokala Hantverkarna" 
            className="h-12 w-auto hover:scale-105 transition-transform duration-300"
          />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Byggprojekt</h1>
            <p className="text-muted-foreground">Hantera och följ upp alla byggprojekt</p>
          </div>
        </div>
        <Button onClick={onAddProject} className="shadow-primary hover:shadow-lg hover:scale-[1.05] transition-all duration-300">
          <Plus className="w-4 h-4" />
          Nytt projekt
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Sök projekt, kunder eller adresser..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="planned">Planerad</SelectItem>
              <SelectItem value="ongoing">Pågående</SelectItem>
              <SelectItem value="completed">Slutförd</SelectItem>
              <SelectItem value="invoiced">Fakturerad</SelectItem>
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={onRegionFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla regioner</SelectItem>
              <SelectItem value="Stockholm">Stockholm</SelectItem>
              <SelectItem value="Västra Götaland">Västra Götaland</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}