import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Plus, Filter, CalendarIcon, X } from 'lucide-react';
import { ProjectStatus, Region } from '@/types/project';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import logo from '../assets/logo.png';

interface ProjectHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: ProjectStatus | 'all' | 'delayed' | 'riskzon';
  onStatusFilterChange: (status: ProjectStatus | 'all' | 'delayed' | 'riskzon') => void;
  regionFilter: Region | 'all';
  onRegionFilterChange: (region: Region | 'all') => void;
  onAddProject: () => void;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  onDateFromChange?: (date: Date | null) => void;
  onDateToChange?: (date: Date | null) => void;
}

export function ProjectHeader({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  regionFilter,
  onRegionFilterChange,
  onAddProject,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: ProjectHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
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
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Sök projekt, kunder eller adresser..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
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
              <SelectItem value="ånger">Ånger</SelectItem>
              <SelectItem value="delayed">🔴 Försenad</SelectItem>
              <SelectItem value="riskzon">🟡 Riskzon</SelectItem>
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

          {/* Date Range Filter */}
          {onDateFromChange && onDateToChange && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "d MMM", { locale: sv }) : "Från datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom || undefined}
                    onSelect={(date) => onDateFromChange(date || null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "d MMM", { locale: sv }) : "Till datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo || undefined}
                    onSelect={(date) => onDateToChange(date || null)}
                    disabled={(date) => dateFrom ? date < dateFrom : false}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onDateFromChange(null);
                    onDateToChange(null);
                  }}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}