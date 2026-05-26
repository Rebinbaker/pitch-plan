import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DeviceBindingState } from '@/hooks/useDeviceBinding';

interface Props {
  binding: DeviceBindingState;
}

export const DeviceBindingGate = ({ binding }: Props) => {
  if (binding.status === 'approved') return null;

  if (binding.status === 'loading') {
    return (
      <div className="mx-4 mt-4 p-4 rounded-lg border bg-card flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Förbereder din enhet…</div>
      </div>
    );
  }

  const isPending = binding.status === 'pending';
  const isRevoked = binding.status === 'revoked';
  const isError = binding.status === 'error';

  return (
    <Card className={`mx-4 mt-4 border-2 ${isPending ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20' : 'border-destructive/60 bg-destructive/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {isPending ? (
            <Smartphone className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          ) : isRevoked ? (
            <ShieldCheck className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold">
              {isPending && 'Ny enhet upptäckt'}
              {isRevoked && 'Enheten är inte längre godkänd'}
              {isError && 'Kunde inte verifiera enheten'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isPending && 'Din chef måste godkänna denna enhet innan du kan checka in.'}
              {isRevoked && 'Be din chef att godkänna enheten igen.'}
              {isError && (binding.message || 'Ett fel uppstod. Försök igen.')}
            </p>
            {isError && (
              <Button size="sm" variant="outline" className="mt-3" onClick={binding.refresh}>
                Försök igen
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
