import { ChefWorkspace } from '@/components/chef/ChefWorkspace';

const ChefStallning = () => (
  <ChefWorkspace
    title="Ställningschef – arbetsyta"
    description="Projekt där ställning behöver planeras, monteras eller nedmonteras."
    filter={(p) =>
      !!p.scaffoldingTeamId ||
      !!p.assignedTrailer ||
      (p.status !== 'completed' && p.status !== 'invoiced')
    }
  />
);

export default ChefStallning;
