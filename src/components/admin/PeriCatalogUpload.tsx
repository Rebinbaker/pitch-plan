import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Trash2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';

interface PeriItem {
  id: string;
  artnr: string;
  name: string;
  category: string | null;
  unit: string;
  price_sek: number | null;
  active: boolean;
}

export function PeriCatalogUpload() {
  const { organizationId } = useOrganization();
  const [items, setItems] = useState<PeriItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newItem, setNewItem] = useState<{ artnr: string; name: string; category: string; unit: string; price_sek: string }>({
    artnr: '', name: '', category: '', unit: 'st', price_sek: '',
  });

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await supabase.from('peri_catalog')
      .select('*').eq('organization_id', organizationId).order('artnr');
    if (error) toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    else setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const importCSV = async (file: File) => {
    if (!organizationId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const header = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());
      const idxArtnr = header.findIndex((h) => h.includes('art'));
      const idxName = header.findIndex((h) => h.includes('namn') || h.includes('name') || h.includes('benämn'));
      const idxCategory = header.findIndex((h) => h.includes('kateg') || h.includes('category') || h.includes('grupp'));
      const idxUnit = header.findIndex((h) => h.includes('enhet') || h.includes('unit'));
      const idxPrice = header.findIndex((h) => h.includes('pris') || h.includes('price'));
      if (idxArtnr < 0 || idxName < 0) throw new Error('CSV måste ha kolumner för artnr och namn');

      const rows = lines.slice(1).map((l) => {
        const cols = l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
        return {
          organization_id: organizationId,
          artnr: cols[idxArtnr],
          name: cols[idxName],
          category: idxCategory >= 0 ? cols[idxCategory] || null : null,
          unit: idxUnit >= 0 && cols[idxUnit] ? cols[idxUnit] : 'st',
          price_sek: idxPrice >= 0 && cols[idxPrice] ? parseFloat(cols[idxPrice].replace(',', '.')) || null : null,
          active: true,
        };
      }).filter((r) => r.artnr && r.name);

      if (rows.length === 0) throw new Error('Inga rader hittades');

      const { error } = await supabase.from('peri_catalog').upsert(rows, { onConflict: 'organization_id,artnr' });
      if (error) throw error;
      toast({ title: 'Import klar', description: `${rows.length} artiklar uppdaterade` });
      load();
    } catch (e: any) {
      toast({ title: 'Importfel', description: e.message, variant: 'destructive' });
    } finally { setImporting(false); }
  };

  const addManual = async () => {
    if (!organizationId || !newItem.artnr || !newItem.name) return;
    const { error } = await supabase.from('peri_catalog').insert({
      organization_id: organizationId,
      artnr: newItem.artnr, name: newItem.name,
      category: newItem.category || null,
      unit: newItem.unit || 'st',
      price_sek: newItem.price_sek ? parseFloat(newItem.price_sek) : null,
      active: true,
    });
    if (error) toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Artikel tillagd' });
      setNewItem({ artnr: '', name: '', category: '', unit: 'st', price_sek: '' });
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('peri_catalog').delete().eq('id', id);
    if (error) toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    else load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />PERI-katalog</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded p-3 bg-muted/30 space-y-2">
          <Label className="text-sm font-medium">Importera CSV</Label>
          <p className="text-xs text-muted-foreground">
            Format: <code>artnr,namn,kategori,enhet,pris</code> (semikolon/tab/komma OK). Existerande artnr uppdateras.
          </p>
          <label>
            <Button asChild variant="outline" size="sm" disabled={importing}>
              <span>{importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}Välj CSV</span>
            </Button>
            <input type="file" accept=".csv,.txt,.tsv" className="hidden"
              onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
          </label>
        </div>

        <div className="border rounded p-3 space-y-2">
          <Label className="text-sm font-medium">Lägg till artikel manuellt</Label>
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-3" placeholder="Art.nr" value={newItem.artnr} onChange={(e) => setNewItem({ ...newItem, artnr: e.target.value })} />
            <Input className="col-span-4" placeholder="Namn" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            <Input className="col-span-2" placeholder="Kategori" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
            <Input className="col-span-1" placeholder="st" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
            <Input className="col-span-1" type="number" placeholder="Pris" value={newItem.price_sek} onChange={(e) => setNewItem({ ...newItem, price_sek: e.target.value })} />
            <Button className="col-span-1" size="sm" onClick={addManual}>+</Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h4 className="font-medium">Befintliga artiklar</h4>
          <Badge variant="outline">{items.length}</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Ingen PERI-katalog uppladdad. AI:n använder generiska PERI UP-komponenter tills katalog finns.</p>
        ) : (
          <div className="border rounded overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr><th className="text-left p-2">Art.nr</th><th className="text-left p-2">Namn</th><th className="text-left p-2">Kategori</th><th className="text-left p-2">Enhet</th><th className="text-right p-2">Pris</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{it.artnr}</td>
                    <td className="p-2">{it.name}</td>
                    <td className="p-2 text-muted-foreground">{it.category || '–'}</td>
                    <td className="p-2 text-muted-foreground">{it.unit}</td>
                    <td className="p-2 text-right">{it.price_sek ? `${it.price_sek} kr` : '–'}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(it.id)}><Trash2 className="w-3 h-3" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
