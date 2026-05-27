import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TeamMember } from '@/types/team';

interface CreateChefLoginButtonProps {
  teamId: string;
  member: TeamMember;
  onCreated?: () => void;
}

export function CreateChefLoginButton({
  teamId,
  member,
  onCreated,
}: CreateChefLoginButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(member.login_email || member.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !password || password.length < 6) {
      toast({
        title: 'Saknar uppgifter',
        description: 'E-post och lösenord (minst 6 tecken) krävs.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-chef-account', {
        body: {
          email,
          password,
          department: member.position,
          teamId,
          memberId: member.id,
        },
      });

      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Okänt fel');
      }

      toast({
        title: 'Inloggning skapad',
        description: `${member.firstName} kan nu logga in med ${email}.`,
      });
      setOpen(false);
      setPassword('');
      onCreated?.();
    } catch (e: any) {
      toast({
        title: 'Kunde inte skapa inloggning',
        description: e?.message ?? 'Okänt fel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasLogin = !!member.user_id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={hasLogin ? 'outline' : 'default'} className="gap-2">
          <KeyRound className="h-3.5 w-3.5" />
          {hasLogin ? 'Inloggning skapad' : 'Skapa inloggning'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Skapa inloggning för {member.firstName} {member.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Roll: <span className="font-medium text-foreground">{member.position}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chef-email">E-post</Label>
            <Input
              id="chef-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@lokalahantverkarna.se"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chef-password">Lösenord</Label>
            <Input
              id="chef-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minst 6 tecken"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Avbryt
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Skapa konto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
