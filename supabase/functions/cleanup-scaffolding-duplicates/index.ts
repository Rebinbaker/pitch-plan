import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScaffoldingRecord {
  id: string;
  name: string;
  updated_at: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scaffolding duplicate cleanup...');

    // Fetch all scaffolding records
    const { data: allScaffolding, error: fetchError } = await supabase
      .from('scaffolding')
      .select('id, name, updated_at, created_at')
      .order('name');

    if (fetchError) {
      console.error('Error fetching scaffolding:', fetchError);
      throw fetchError;
    }

    if (!allScaffolding || allScaffolding.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No scaffolding records found',
          deleted: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allScaffolding.length} total scaffolding records`);

    // Group records by name (case-insensitive and trimmed)
    const groupedByName = new Map<string, ScaffoldingRecord[]>();
    
    allScaffolding.forEach((record) => {
      const normalizedName = record.name.trim().toLowerCase();
      if (!groupedByName.has(normalizedName)) {
        groupedByName.set(normalizedName, []);
      }
      groupedByName.get(normalizedName)!.push(record as ScaffoldingRecord);
    });

    console.log(`Found ${groupedByName.size} unique scaffold names`);

    // Find duplicates and collect IDs to delete
    const idsToDelete: string[] = [];
    const duplicateGroups: { name: string; count: number; kept: string; deleted: string[] }[] = [];

    groupedByName.forEach((records, normalizedName) => {
      if (records.length > 1) {
        console.log(`Found ${records.length} duplicates for: ${records[0].name}`);
        
        // Sort by updated_at DESC (most recent first)
        records.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA;
        });

        // Keep the first (most recent), delete the rest
        const [kept, ...toDelete] = records;
        const deletedIds = toDelete.map(r => r.id);
        
        idsToDelete.push(...deletedIds);
        duplicateGroups.push({
          name: kept.name,
          count: records.length,
          kept: kept.id,
          deleted: deletedIds
        });

        console.log(`Will keep ID ${kept.id} and delete ${deletedIds.length} duplicates`);
      }
    });

    if (idsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No duplicates found',
          deleted: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting ${idsToDelete.length} duplicate records...`);

    // Delete duplicates
    const { error: deleteError } = await supabase
      .from('scaffolding')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
      throw deleteError;
    }

    console.log('Successfully deleted duplicates');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully removed ${idsToDelete.length} duplicate records`,
        deleted: idsToDelete.length,
        duplicateGroups
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

