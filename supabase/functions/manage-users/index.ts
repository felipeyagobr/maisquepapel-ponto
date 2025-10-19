import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user's JWT from the request header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user's session using the service role client
    const { data: { user }, error: userError } = await supabaseServiceRole.auth.getUser(token);

    if (userError || !user) {
      console.error('Error getting user from token:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the user's profile to check their role
    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('User is not an admin or profile not found:', profileError?.message);
      return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can perform this action' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User is an admin, proceed with the requested action
    if (req.method === 'GET') {
      // List all users
      const { data: users, error: listUsersError } = await supabaseServiceRole.auth.admin.listUsers();

      if (listUsersError) {
        console.error('Error listing users:', listUsersError.message);
        return new Response(JSON.stringify({ error: listUsersError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch profiles to combine with auth users
      const { data: profiles, error: profilesError } = await supabaseServiceRole
        .from('profiles')
        .select('id, first_name, last_name, role, avatar_url, updated_at');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError.message);
        return new Response(JSON.stringify({ error: profilesError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const usersMap = new Map(users.users.map(u => [u.id, u.email]));
      const combinedEmployees = profiles.map(p => ({
        ...p,
        email: usersMap.get(p.id) || 'N/A',
      }));

      return new Response(JSON.stringify(combinedEmployees), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else if (req.method === 'POST') {
      // Invite a new user
      const { email, first_name, last_name, role } = await req.json();

      if (!email || !first_name || !role) {
        return new Response(JSON.stringify({ error: 'Bad Request: email, first_name, and role are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error: inviteError } = await supabaseServiceRole.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: first_name,
          last_name: last_name,
          role: role,
        },
        redirectTo: `${req.headers.get('Origin')}/login`, // Use Origin from request for redirect
      });

      if (inviteError) {
        console.error('Error inviting user:', inviteError.message);
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: `Convite enviado para ${email}.`, user: data.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else if (req.method === 'DELETE') {
      // Delete a user
      const { userId } = await req.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Bad Request: userId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteUserError } = await supabaseServiceRole.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        console.error('Error deleting user:', deleteUserError.message);
        return new Response(JSON.stringify({ error: deleteUserError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unhandled error:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});