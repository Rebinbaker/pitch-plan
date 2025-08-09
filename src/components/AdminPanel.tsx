import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Shield, User, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserRole } from '@/hooks/useUserRole';

interface UserData {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users for admin panel...');
      
      // Use the secure admin function to get user details
      const { data: usersData, error } = await supabase
        .rpc('get_users_for_admin');

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Fel vid hämtning av användare: ' + error.message);
        return;
      }

      console.log('Fetched users data:', usersData);

      if (!usersData || usersData.length === 0) {
        console.log('No users found');
        setUsers([]);
        return;
      }

      // Transform the data to match UserData interface
      const transformedUsers: UserData[] = usersData.map(user => ({
        id: user.user_id,
        email: user.email,
        username: user.username || 'Okänd användare',
        role: user.role as UserRole,
        created_at: user.created_at,
      }));

      console.log('Transformed users:', transformedUsers);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Fel vid hämtning av användare');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (userId: string, email: string) => {
    try {
      // Delete user from auth.users (this will cascade to profiles and user_roles)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        console.error('Error deleting user:', error);
        toast.error('Fel vid radering av användare');
        return;
      }

      toast.success(`Användare ${email} har raderats`);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Fel vid radering av användare');
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        toast.error('Fel vid uppdatering av användarroll');
        return;
      }

      toast.success('Användarroll uppdaterad');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Fel vid uppdatering av användarroll');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'moderator':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Administratörspanel</CardTitle>
          <CardDescription>Hantera användare och roller</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Laddar användare...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Administratörspanel
        </CardTitle>
        <CardDescription>
          Hantera användare och roller i systemet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-post</TableHead>
                <TableHead>Användarnamn</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead>Skapad</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role}
                        onValueChange={(newRole: UserRole) => updateUserRole(user.id, newRole)}
                        disabled={user.role === 'admin'} // Prevent changing admin role
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Användare
                            </div>
                          </SelectItem>
                          <SelectItem value="moderator">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Moderator
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('sv-SE')}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={user.role === 'admin'} // Prevent deleting admin
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Radera användare</AlertDialogTitle>
                          <AlertDialogDescription>
                            Är du säker på att du vill radera användaren <strong>{user.email}</strong>? 
                            Denna åtgärd kan inte ångras och kommer att ta bort alla användarens data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUser(user.id, user.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Radera användare
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {users.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Inga användare hittades
          </div>
        )}
      </CardContent>
    </Card>
  );
};