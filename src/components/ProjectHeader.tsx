import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Filter, CalendarIcon, X } from 'lucide-react';
import { ProjectStatus, Region } from '@/types/project';
import { useRegions } from '@/hooks/useRegions';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import logo from '../assets/logo.png';

export type StatusFilterValue = ProjectStatus | 'delayed' | 'riskzon';

interface ProjectHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilters: StatusFilterValue[];
  onStatusFiltersChange: (statuses: StatusFilterValue[]) => void;
  regionFilter: Region | 'all';
  onRegionFilterChange: (region: Region | 'all') => void;
  onAddProject: () => void;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  onDateFromChange?: (date: Date | null) => void;
  onDateToChange?: (date: Date | null) => void;
}

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'planned', label: 'Planerad' },
  { value: 'ongoing', label: 'Pågående' },
  { value: 'completed', label: 'Slutförd' },
  { value: 'invoiced', label: 'Fakturerad' },
  { value: 'ånger', label: 'Ånger' },
  { value: 'delayed', label: '🔴 Försenad' },
  { value: 'riskzon', label: '🟡 Riskzon' },
];

export function ProjectHeader({
  searchTerm,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  regionFilter,
  onRegionFilterChange,
  onAddProject,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: ProjectHeaderProps) {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const toggleStatus = (value: StatusFilterValue) => {
    if (statusFilters.includes(value)) {
      onStatusFiltersChange(statusFilters.filter(s => s !== value));
    } else {
      onStatusFiltersChange([...statusFilters, value]);
    }
  };

  const statusLabel = statusFilters.length === 0
    ? 'Alla statusar'
    : statusFilters.length <= 2
      ? STATUS_OPTIONS.filter(o => statusFilters.includes(o.value)).map(o => o.label).join(', ')
      : `${statusFilters.length} valda`;

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
          <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-auto min-w-[140px] justify-start gap-2 font-normal", statusFilters.length > 0 && "text-foreground")}>
                <Filter className="w-4 h-4 shrink-0" />
                <span className="truncate">{statusLabel}</span>
                {statusFilters.length > 0 && (
                  <X
                    className="w-3.5 h-3.5 shrink-0 ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusFiltersChange([]);
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="start">
              <div className="space-y-1">
                {STATUS_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Checkbox
                      checked={statusFilters.includes(option.value)}
                      onCheckedChange={() => toggleStatus(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={regionFilter} onValueChange={onRegionFilterChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla regioner</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
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