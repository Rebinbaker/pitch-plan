import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConstructionTeam, TeamMember } from '@/types/team';

interface Props {
  team: ConstructionTeam;
  member: TeamMember;
  onCreated: () => void;
  trigger?: React.ReactNode;
}

export function CreateWorkerLoginModal({ team, member, onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(member.login_email || member.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pw);
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      toast({ title: 'Fyll i e-post och lösenord', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Lösenordet måste vara minst 8 tecken', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-worker-account', {
        body: {
          email,
          password,
          team_id: team.id,
          team_member_id: member.id,
          display_name: `${member.firstName} ${member.lastName}`,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: 'Inlogg skapat',
        description: `${member.firstName} kan nu logga in med ${email}`,
      });
      onCreated();
      setOpen(false);
      setPassword('');
    } catch (e: any) {
      toast({
        title: 'Kunde inte skapa konto',
        description: e.message || 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <KeyRound className="w-4 h-4 mr-1" />
            Skapa inlogg
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Skapa inlogg åt {member.firstName} {member.lastName}
          </DialogTitle>
          <DialogDescription>
            Byggaren kan logga in i bygg-appen och checka in på sina tilldelade projekt.
          </DialogDescription>
        </DialogHeader>

        {member.user_id ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Inlogg redan skapat</span>
            </div>
            {member.login_email && (
              <p className="text-sm text-muted-foreground">E-post: {member.login_email}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="login-email">E-post</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="byggare@exempel.se"
              />
            </div>
            <div>
              <Label htmlFor="login-password">Lösenord (minst 8 tecken)</Label>
              <div className="flex gap-2">
                <Input
                  id="login-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generera
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Spara/skicka detta till byggaren — det visas inte igen.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Avbryt
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Skapa konto
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
