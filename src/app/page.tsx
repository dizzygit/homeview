
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { NextPage } from 'next';
import { HomeIcon, LogOut } from 'lucide-react';

import ConnectionForm from '@/components/homeview/ConnectionForm';
import type { ConnectionFormValues } from '@/components/homeview/ConnectionForm';
import EntityList from '@/components/homeview/EntityList';
import DynamicChart from '@/components/homeview/DynamicChart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Entity, FormattedChartDataPoint, EntityHistoryPoint } from '@/types/home-assistant';

const HomeViewPage: NextPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [homeAssistantUrl, setHomeAssistantUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null); // This will store the token (LLAT)
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [chartData, setChartData] = useState<FormattedChartDataPoint[]>([]);
  const [loading, setLoading] = useState({ connect: false, entities: false, chart: false });

  const { toast } = useToast();

  const handleConnect = async (values: ConnectionFormValues) => {
    setLoading(prev => ({ ...prev, connect: true, entities: true }));
    try {
      const response = await fetch('/api/homeassistant/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeAssistantUrl: values.homeAssistantUrl,
          token: values.password, // Using password field as token
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to connect: ${response.statusText}`);
      }

      const fetchedEntities: Entity[] = await response.json();
      
      setHomeAssistantUrl(values.homeAssistantUrl);
      setUsername(values.username); // Storing username as per form, though not used in HA API calls if password is LLAT
      setPassword(values.password); // Storing token (LLAT)
      setEntities(fetchedEntities);
      setIsConnected(true);
      toast({ title: "Successfully Connected", description: "Fetched entities from Home Assistant." });
    } catch (error) {
      console.error("Connection failed:", error);
      toast({ variant: "destructive", title: "Connection Failed", description: (error as Error).message });
    } finally {
      setLoading(prev => ({ ...prev, connect: false, entities: false }));
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setHomeAssistantUrl(null);
    setUsername(null);
    setPassword(null);
    setEntities([]);
    setSelectedEntityIds([]);
    setChartData([]);
    toast({ title: "Disconnected", description: "You have been disconnected from Home Assistant." });
  };

  const handleEntitySelectionChange = (entityId: string, selected: boolean) => {
    setSelectedEntityIds(prev =>
      selected ? [...prev, entityId] : prev.filter(id => id !== entityId)
    );
  };

  const formatChartData = (historyData: Record<string, EntityHistoryPoint[]>): FormattedChartDataPoint[] => {
    const allTimestamps = new Set<number>();
    Object.values(historyData).forEach(entityHistory => {
      entityHistory.forEach(point => allTimestamps.add(point.lu * 1000)); // HA lu is in seconds
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    return sortedTimestamps.map(timestamp => {
      const dataPoint: FormattedChartDataPoint = {
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      selectedEntityIds.forEach(id => {
        const entityHistory = historyData[id];
        if (entityHistory) {
          const point = entityHistory.find(p => p.lu * 1000 === timestamp);
          dataPoint[id] = point ? Number(point.s) : NaN; 
        }
      });
      return dataPoint;
    }).filter(dp => 
        selectedEntityIds.some(id => dp[id] !== undefined && !isNaN(Number(dp[id])))
    );
  };

  const fetchChartData = useCallback(async () => {
    if (selectedEntityIds.length === 0 || !homeAssistantUrl || !password) {
      setChartData([]);
      return;
    }

    setLoading(prev => ({ ...prev, chart: true }));
    try {
      const historyPromises = selectedEntityIds.map(async (id) => {
        const response = await fetch('/api/homeassistant/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: id,
            homeAssistantUrl,
            token: password,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch history for ${id}: ${response.statusText}`);
        }
        return { id, history: await response.json() as EntityHistoryPoint[] };
      });
      
      const results = await Promise.all(historyPromises);
      
      const historiesMap: Record<string, EntityHistoryPoint[]> = {};
      results.forEach(result => {
        historiesMap[result.id] = result.history;
      });
      
      const formattedData = formatChartData(historiesMap);
      setChartData(formattedData);

    } catch (error) {
      console.error("Failed to fetch chart data:", error);
      toast({ variant: "destructive", title: "Chart Error", description: (error as Error).message });
    } finally {
      setLoading(prev => ({ ...prev, chart: false }));
    }
  }, [selectedEntityIds, homeAssistantUrl, password, toast]); // username removed as it's not used for token auth for HA API

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Simulate real-time updates (can be removed or enhanced to re-fetch real data)
  useEffect(() => {
    if (!isConnected || selectedEntityIds.length === 0 || loading.chart) return;

    const interval = setInterval(() => {
      setChartData(prevData => {
        if (prevData.length === 0 && selectedEntityIds.length > 0) {
          // If no data but entities selected, perhaps fetch again or wait
          // For now, let's not add random data if initial real data was empty.
          console.warn("Real-time update skipped: No initial data to base random updates on.");
          return prevData;
        }
        if (prevData.length === 0) return prevData;


        const newDataPoint: FormattedChartDataPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        
        selectedEntityIds.forEach(id => {
          const lastPoint = prevData[prevData.length - 1];
          const lastValue = lastPoint && lastPoint[id] !== undefined ? Number(lastPoint[id]) : (Math.random() * 100);

          // Only apply random updates if lastValue is a valid number
          if (!isNaN(lastValue)) {
            const change = (Math.random() - 0.5) * (lastValue * 0.05); 
            let newValue = lastValue + change;
            if (id.includes('humidity')) newValue = Math.max(0, Math.min(100, newValue)); 
            newDataPoint[id] = parseFloat(newValue.toFixed(1));
          } else {
            // If last value was NaN, keep it NaN or use a placeholder
            newDataPoint[id] = NaN; 
          }
        });

        const updatedData = [...prevData, newDataPoint];
        return updatedData.slice(-60); 
      });
    }, 5000); 

    return () => clearInterval(interval);
  }, [isConnected, selectedEntityIds, loading.chart]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <HomeIcon className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">HomeView</h1>
          </div>
          {isConnected && (
            <Button variant="ghost" size="icon" onClick={handleDisconnect} aria-label="Disconnect">
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6">
        {!isConnected ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <ConnectionForm onConnect={handleConnect} loading={loading.connect} />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            <EntityList
              entities={entities}
              selectedEntityIds={selectedEntityIds}
              onSelectionChange={handleEntitySelectionChange}
              loading={loading.entities}
            />
            <DynamicChart
              data={chartData}
              selectedEntities={entities.filter(e => selectedEntityIds.includes(e.entity_id))}
              loading={loading.chart}
            />
          </div>
        )}
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t bg-card/80">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
            HomeView - Your Home Assistant Dashboard.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomeViewPage;
