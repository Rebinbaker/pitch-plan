import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from "sonner";
import { PasswordStrength } from '@/components/PasswordStrength';
import { supabase } from '@/integrations/supabase/client';
import logo from '../assets/logo.png';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Felaktiga inloggningsuppgifter. Kontrollera e-post och lösenord.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Kontot är inte bekräftat. Kontrollera din e-post och bekräfta kontot först.');
        } else {
          toast.error('Fel vid inloggning: ' + error.message);
        }
      }
    } catch (error) {
      toast.error('Ett oväntat fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Användarnamn är obligatoriskt');
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
        toast.success("Konto skapat! Du har fått ett bekräftelsemail från Lokala Hantverkarna.");
        setShowResendEmail(true);
        setResendEmail(email);
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

  const handleResendEmail = async () => {
    if (!resendEmail) {
      toast.error('Ingen email-adress att skicka till');
      return;
    }

    setResendLoading(true);
    try {
      // Use Supabase's resend function to send the same template as signup
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast.error('Fel vid skickning av email: ' + error.message);
      } else {
        toast.success('Bekräftelsemail skickat på nytt från Lokala Hantverkarna! Kontrollera din inkorg.');
      }
    } catch (error) {
      toast.error('Ett oväntat fel uppstod');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Background video */}
      <div className="absolute inset-0">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMwZjBmMjMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMDAwMDAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg=="
        >
          <source 
            src="https://mskdohetwbbkuexcolcl.supabase.co/storage/v1/object/public/videos/AdobeStock_1138651004.mov" 
            type="video/mp4"
          />
          {/* Fallback for browsers that don't support video */}
          <div className="w-full h-full bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-black"></div>
        </video>
        
        {/* Video overlay for darkening effect */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Gradient overlays for additional styling */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-blue-900/30"></div>
      </div>

      {/* Logo in top left corner */}
      <div className="absolute top-8 left-8 z-20">
        <img 
          src="/lovable-uploads/663de771-3c57-4835-b1a3-ba1e171d7dc9.png" 
          alt="Lokala Hantverkarna" 
          className="w-64 h-auto drop-shadow-lg"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">

          {/* Main card with gradient border */}
          <div className="relative">
            {/* Gradient border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-xl blur opacity-30 animate-pulse"></div>
            
            {/* Main card */}
            <Card className="relative bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Välkommen till framtiden
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Anslut dig till Lokala Hantverkarna och bli en del av något större
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
                    <TabsTrigger 
                      value="signin" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                    >
                      Logga in
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                    >
                      Skapa konto
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">E-post</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="din@epost.se"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Lösenord</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Ditt lösenord"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg transform transition hover:scale-105" 
                        disabled={loading}
                      >
                        {loading ? 'Loggar in...' : 'Logga in'}
                      </Button>
                      
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setForgotPasswordOpen(true)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          Glömt lösenord?
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-username">Användarnamn</Label>
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="Ditt namn"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-post</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="din@epost.se"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Lösenord</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Minst 6 tecken"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                        <PasswordStrength password={password} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password">Bekräfta lösenord</Label>
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="Bekräfta ditt lösenord"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg transform transition hover:scale-105" 
                        disabled={loading}
                      >
                        {loading ? 'Skapar konto...' : 'Skapa konto'}
                      </Button>
                    </form>

                    {showResendEmail && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-gray-700 mb-3 text-center">
                          Fick du inget bekräftelseemail?
                        </p>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={handleResendEmail}
                          disabled={resendLoading}
                          className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          {resendLoading ? 'Skickar...' : 'Skicka om bekräftelseemail'}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Tech footer */}
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              Säker inloggning med <span className="text-purple-400">kryptering</span> och{' '}
              <span className="text-blue-400">moderna säkerhetstekniker</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Återställ lösenord
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-post</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="din@epost.se"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={forgotPasswordLoading}
              >
                {forgotPasswordLoading ? 'Skickar...' : 'Skicka återställningslänk'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setForgotPasswordOpen(false)}
                className="border-gray-300"
              >
                Avbryt
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;