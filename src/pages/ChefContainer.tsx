import { ChefWorkspace } from '@/components/chef/ChefWorkspace';

const ChefContainer = () => (
  <ChefWorkspace
    title="Containeransvarig – arbetsyta"
    description="Projekt där container behöver bokas, levereras eller hämtas."
    filter={(p) => p.status !== 'completed' && p.status !== 'invoiced'}
  />
);

export default ChefContainer;
