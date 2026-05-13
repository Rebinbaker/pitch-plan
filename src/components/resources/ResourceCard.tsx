import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Globe, MapPin, Star, Pencil, Trash2, Copy } from 'lucide-react';
import { Resource } from '@/types/resource';
import { getResourceTypeConfig } from '@/data/resourceTypes';
import { toast } from '@/hooks/use-toast';

interface Props {
  resource: Resource;
  onEdit: () => void;
  onDelete?: () => void;
  onToggleFavorite: () => void;
}

export function ResourceCard({ resource, onEdit, onDelete, onToggleFavorite }: Props) {
  const copy = () => {
    const lines = [
      resource.name,
      resource.company,
      resource.contactPerson,
      resource.phone,
      resource.email,
      [resource.address, resource.postalCode, resource.city].filter(Boolean).join(' '),
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Kopierat till urklipp' });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{resource.name}</h3>
              {resource.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
            </div>
            {resource.company && resource.company !== resource.name && (
              <p className="text-sm text-muted-foreground truncate">{resource.company}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFavorite}>
              <Star className={`h-4 w-4 ${resource.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {resource.resourceTypes.map((t) => {
            const cfg = getResourceTypeConfig(t);
            const Icon = cfg.icon;
            return (
              <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.color}`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            );
          })}
        </div>

        <div className="space-y-1 text-sm">
          {resource.contactPerson && (
            <p className="text-muted-foreground">{resource.contactPerson}</p>
          )}
          {(resource.city || resource.address) && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[resource.address, resource.city].filter(Boolean).join(', ')}
            </p>
          )}
          {resource.notes && (
            <p className="text-xs text-muted-foreground italic line-clamp-2 pt-1">{resource.notes}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {resource.phone && (
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${resource.phone}`}>
                <Phone className="h-3.5 w-3.5 mr-1" />
                {resource.phone}
              </a>
            </Button>
          )}
          {resource.email && (
            <Button asChild variant="outline" size="sm">
              <a href={`mailto:${resource.email}`}>
                <Mail className="h-3.5 w-3.5 mr-1" />
                Maila
              </a>
            </Button>
          )}
          {resource.website && (
            <Button asChild variant="outline" size="sm">
              <a href={resource.website.startsWith('http') ? resource.website : `https://${resource.website}`} target="_blank" rel="noreferrer">
                <Globe className="h-3.5 w-3.5 mr-1" />
                Webb
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={copy}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Kopiera
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
