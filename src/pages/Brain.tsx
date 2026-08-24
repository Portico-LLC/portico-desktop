import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { BrainChat } from '@/components/brain/BrainChat';
import { BrainGraph } from '@/components/brain/BrainGraph';
import { useBrainStore } from '@/store/brain';
import { MessageSquareText, Network } from 'lucide-react';

export function Brain() {
  const location = useLocation();
  const navigate = useNavigate();
  const reset = useBrainStore((s) => s.reset);
  const view = location.pathname.endsWith('/graph') ? 'graph' : 'chat';

  useEffect(() => {
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Brain</h1>
          <p className="text-ink-500">Ask anything about your studio, or tell it what to do.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'chat' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => navigate('/brain')}
          >
            <MessageSquareText size={16} className="mr-1.5" />
            Chat
          </Button>
          <Button
            variant={view === 'graph' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => navigate('/brain/graph')}
          >
            <Network size={16} className="mr-1.5" />
            Graph
          </Button>
        </div>
      </div>

      {view === 'chat' ? <BrainChat /> : <BrainGraph />}
    </div>
  );
}
