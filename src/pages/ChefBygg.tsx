import { ChefWorkspace } from '@/components/chef/ChefWorkspace';

const ChefBygg = () => (
  <ChefWorkspace
    title="Byggledare – arbetsyta"
    description="Material, teknisk planering, egenkontroller och slutbesiktning."
    filter={(p) => p.status !== 'completed' && p.status !== 'invoiced'}
  />
);

export default ChefBygg;
