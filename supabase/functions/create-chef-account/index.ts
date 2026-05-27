import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type ChefDepartment =
  | 'Produktionscontroller'
  | 'Byggledare'
  | 'Ställningschef'
  | 'Containeransvarig';

const departmentToRole = (dept: string): string => {
  switch (dept) {
    case 'Produktionscontroller':
      return 'production_controller';
    case 'Byggledare':
      return 'construction_manager';
    case 'Ställningschef':
      return 'scaffolding_manager';
    case 'Containeransvarig':
      return 'container_manager';
    default:
      return 'user';
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, department, teamId, memberId } = await req.json();

    if (!email || !password || !department) {
      return new Response(
        JSON.stringify({ error: 'email, password and department are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: callerData, error: callerErr } =
      await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: callerData.user.id,
      _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can create chef accounts' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create auth user
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { department },
      });

    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message ?? 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = created.user.id;
    const role = departmentToRole(department as ChefDepartment);

    // Upsert user_role (override default 'user' inserted by trigger)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId);
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role });

    if (roleErr) {
      return new Response(
        JSON.stringify({ error: `Role assignment failed: ${roleErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update team member with the new user_id and login_email
    if (teamId && memberId) {
      const { data: team } = await supabaseAdmin
        .from('teams')
        .select('members')
        .eq('id', teamId)
        .maybeSingle();

      if (team) {
        const members = Array.isArray(team.members) ? team.members : [];
        const updated = members.map((m: any) =>
          m.id === memberId
            ? { ...m, user_id: newUserId, login_email: email }
            : m
        );
        await supabaseAdmin
          .from('teams')
          .update({ members: updated })
          .eq('id', teamId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId, role }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
