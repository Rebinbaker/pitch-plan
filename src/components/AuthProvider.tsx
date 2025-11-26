import React from 'react';
import { useEffect } from 'react';
import { AuthContext, useAuthState } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authState = useAuthState();

  useEffect(() => {
    const setUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get profile with display name
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', user.id)
          .single();
        
        // Set global variable for easy access
        (window as any).__currentUserName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'Okänd användare';
      }
    };

    setUserName();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setUserName();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};