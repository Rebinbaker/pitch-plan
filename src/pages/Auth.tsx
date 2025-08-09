import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PasswordStrength } from '@/components/PasswordStrength';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vänligen fyll i e-post och lösenord');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Fel e-post eller lösenord');
        } else {
          toast.error('Fel vid inloggning: ' + error.message);
        }
      } else {
        toast.success('Inloggad!');
        window.location.href = '/';
      }
    } catch (error) {
      toast.error('Ett oväntat fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !username) {
      toast.error('Vänligen fyll i alla fält');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Lösenorden matchar inte');
      return;
    }

    if (password.length < 6) {
      toast.error('Lösenordet måste vara minst 6 tecken');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error('Lösenordet måste innehålla minst en stor bokstav');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      toast.error('Lösenordet måste innehålla minst ett specialtecken');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, username);
      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('En användare med denna e-post finns redan');
        } else if (error.message.includes('Password should be at least 6 characters')) {
          toast.error('Lösenordet måste vara minst 6 tecken');
        } else {
          toast.error('Fel vid registrering: ' + error.message);
        }
      } else {
        // Get confirmation token from signup response and send custom welcome email
        try {
          // First, get the user to get confirmation token
          const { data: authData } = await supabase.auth.getSession();
          console.log('Sending custom welcome email after signup');
          
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email,
              confirmationUrl: `${window.location.origin}/auth?confirmed=true`,
              username
            }
          });
          console.log('Custom welcome email sent successfully');
        } catch (emailError) {
          console.log('Welcome email error:', emailError);
          // Don't fail the signup if email fails
        }
        
        toast.success('Konto skapat! Kontrollera din e-post för att verifiera kontot.');
        setActiveTab('signin');
      }
    } catch (error) {
      toast.error('Ett oväntat fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast.error('Vänligen ange din e-postadress');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth`
      });
      
      if (error) {
        toast.error('Fel vid återställning: ' + error.message);
      } else {
        toast.success('Återställningslänk skickad till din e-post!');
        setForgotPasswordOpen(false);
        setForgotPasswordEmail('');
      }
    } catch (error) {
      toast.error('Ett oväntat fel uppstod');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/lovable-uploads/e784bfba-aa1d-4a91-a9f6-01f29efadff2.png" alt="Lokala Hantverkarna Logotyp" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Välkommen</CardTitle>
          <CardDescription>
            Logga in eller skapa ett nytt konto för att komma åt ditt projekt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Skapa konto</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.se"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Lösenord</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ditt lösenord"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Loggar in...' : 'Logga in'}
                </Button>
                
                <div className="text-center">
                  <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-sm">
                        Glömt lösenord?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Återställ lösenord</DialogTitle>
                        <DialogDescription>
                          Ange din e-postadress så skickar vi en återställningslänk
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email">E-post</Label>
                          <Input
                            id="forgot-email"
                            type="email"
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                            placeholder="din@email.se"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                          {forgotPasswordLoading ? 'Skickar...' : 'Skicka återställningslänk'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-post</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.se"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Användarnamn</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="användarnamn"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Lösenord</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minst 6 tecken"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Bekräfta lösenord</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Upprepa lösenordet"
                    required
                  />
                </div>
                {password && <PasswordStrength password={password} />}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Skapar konto...' : 'Skapa konto'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;