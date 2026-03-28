import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Phone, Mail, Users } from 'lucide-react';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { AddCustomerModal } from './AddCustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { Project } from '@/types/project';

interface CustomersViewProps {
  projects: Project[];
}

export const CustomersView = ({ projects }: CustomersViewProps) => {
  const {
    customers, interactions, loading,
    addCustomer, updateCustomer, deleteCustomer,
    addInteraction, loadInteractions,
  } = useCustomers();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q)) ||
      (c.city?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kundregister ({customers.length})
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök namn, telefon, e-post..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-1" />Ny kund
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">Laddar kunder...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {search ? 'Inga kunder matchade sökningen.' : 'Inga kunder tillagda ännu.'}
              </p>
              {!search && (
                <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-1" />Lägg till din första kund
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(customer => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{customer.name}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {customer.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {customer.city && (
                    <Badge variant="outline" className="ml-2 shrink-0">{customer.city}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addCustomer}
      />

      {selectedCustomer && (
        <CustomerDetailModal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          interactions={interactions}
          projects={projects}
          onUpdate={updateCustomer}
          onDelete={deleteCustomer}
          onAddInteraction={addInteraction}
          onLoadInteractions={loadInteractions}
        />
      )}
    </div>
  );
};
