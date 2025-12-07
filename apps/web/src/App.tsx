import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';

function App() {
  const { data, isLoading } = useQuery({
    queryKey: ['hello'],
    queryFn: async () => {
      const res = await api.hello.$get();
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Griffiths CRM</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <p className="text-muted-foreground">{data?.message}</p>
        )}
      </div>
    </div>
  );
}

export default App;
