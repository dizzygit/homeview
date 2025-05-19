
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
  const [token, setToken] = useState<string | null>(null);
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
          token: values.token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to connect: ${response.statusText}`);
      }

      const fetchedEntities: Entity[] = await response.json();
      
      setHomeAssistantUrl(values.homeAssistantUrl);
      setToken(values.token);
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
    setToken(null);
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
    Object.values(historyData).forEach(entityHistoryList => {
      entityHistoryList.forEach(point => allTimestamps.add(point.lu * 1000)); // HA lu is in seconds
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    const formattedPoints = sortedTimestamps.map(timestamp => {
      const dataPoint: FormattedChartDataPoint = {
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      selectedEntityIds.forEach(id => {
        const entityHistory = historyData[id];
        if (entityHistory) {
          const point = entityHistory.find(p => p.lu * 1000 === timestamp);
          
          let numericValue = NaN;
          if (point && point.s !== null && point.s !== undefined) {
            const stateString = String(point.s);
            // Attempt to replace comma with period for locales that use comma as decimal separator
            const sanitizedStateString = stateString.replace(',', '.');
            numericValue = Number(sanitizedStateString);
          }
          dataPoint[id] = numericValue;
        } else {
          dataPoint[id] = NaN; // Entity might not have history data or not be in selection
        }
      });
      return dataPoint;
    });

    // Filter out data points where all selected entities have NaN values
    return formattedPoints.filter(dp => 
        selectedEntityIds.some(id => dp[id] !== undefined && !isNaN(dp[id] as number))
    );
  };

  const fetchChartData = useCallback(async () => {
    if (selectedEntityIds.length === 0 || !homeAssistantUrl || !token) {
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
            token: token,
          }),
        });
        if (!response.ok) {
          let errorDetails = `Status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || JSON.stringify(errorData);
          } catch (e) {
            // If error response is not JSON, try to get text
             try {
                errorDetails = await response.text();
             } catch (e) { /* ignore */ }
          }
          console.error(`Failed to fetch history for ${id}: ${errorDetails}`);
          throw new Error(`Failed to fetch history for ${id}. ${errorDetails.substring(0,100)}`);
        }
        const history = await response.json() as EntityHistoryPoint[];
        return { id, history };
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
  }, [selectedEntityIds, homeAssistantUrl, token, toast]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Real-time data fetching for chart updates
  useEffect(() => {
    if (!isConnected || selectedEntityIds.length === 0 || loading.chart) return;

    const interval = setInterval(() => {
      fetchChartData();
    }, 30000); // Fetch every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, selectedEntityIds, loading.chart, fetchChartData]);

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
