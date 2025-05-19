"use client";

import { useState, useEffect, useCallback } from 'react';
import type { NextPage } from 'next';
import { HomeIcon, LogOut, Loader2 } from 'lucide-react';

import ConnectionForm from '@/components/homeview/ConnectionForm';
import EntityList from '@/components/homeview/EntityList';
import DynamicChart from '@/components/homeview/DynamicChart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Entity, FormattedChartDataPoint, EntityHistoryPoint } from '@/types/home-assistant';

// Mock API functions
const MOCK_API_DELAY = 1000;

const mockFetchEntities = async (apiUrl: string, token: string): Promise<Entity[]> => {
  console.log('Mock fetching entities from:', apiUrl, 'with token:', token);
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY));
  // Simulate API error
  // if (Math.random() < 0.2) throw new Error("Failed to fetch entities (simulated)");
  return [
    { entity_id: 'sensor.living_room_temperature', state: '22.5', attributes: { friendly_name: 'Living Room Temp', unit_of_measurement: '°C', device_class: 'temperature' }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null} },
    { entity_id: 'sensor.office_humidity', state: '45.2', attributes: { friendly_name: 'Office Humidity', unit_of_measurement: '%', device_class: 'humidity' }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null} },
    { entity_id: 'sensor.bedroom_light_level', state: '150', attributes: { friendly_name: 'Bedroom Light', unit_of_measurement: 'lx', device_class: 'illuminance' }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null} },
    { entity_id: 'sensor.power_consumption', state: '350.7', attributes: { friendly_name: 'Power Consumption', unit_of_measurement: 'W', device_class: 'power' }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null} },
    { entity_id: 'light.living_room_lamp', state: 'on', attributes: { friendly_name: 'Living Room Lamp' }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null} }, // Not a numerical sensor
    { entity_id: 'switch.fan', state: 'off', attributes: { friendly_name: 'Fan Switch' }, last_changed: '', last_updated: '', context: { id: '', parent_id: null, user_id: null} }, // Not a numerical sensor
  ];
};

const mockFetchEntityHistory = async (entityId: string, apiUrl: string, token: string): Promise<EntityHistoryPoint[]> => {
  console.log(`Mock fetching history for ${entityId}`);
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2));
  // if (Math.random() < 0.1) throw new Error(`Failed to fetch history for ${entityId} (simulated)`);
  
  const now = Date.now();
  const history: EntityHistoryPoint[] = [];
  for (let i = 59; i >= 0; i--) { // Last 60 minutes, one point per minute
    const timestamp = now - i * 60 * 1000;
    let value;
    if (entityId.includes('temperature')) value = 20 + Math.random() * 5;
    else if (entityId.includes('humidity')) value = 40 + Math.random() * 10;
    else if (entityId.includes('light')) value = Math.random() * 300;
    else value = Math.random() * 500;
    history.push({ lu: Math.floor(timestamp / 1000) , s: parseFloat(value.toFixed(1)) });
  }
  return history;
};


const HomeViewPage: NextPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [chartData, setChartData] = useState<FormattedChartDataPoint[]>([]);
  const [loading, setLoading] = useState({ connect: false, entities: false, chart: false });

  const { toast } = useToast();

  const handleConnect = async (values: { apiUrl: string; token: string }) => {
    setLoading(prev => ({ ...prev, connect: true, entities: true }));
    try {
      // In a real app, you would validate the connection here
      // For now, we just store credentials and fetch entities
      const fetchedEntities = await mockFetchEntities(values.apiUrl, values.token);
      setApiUrl(values.apiUrl);
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
    setApiUrl(null);
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
    Object.values(historyData).forEach(entityHistory => {
      entityHistory.forEach(point => allTimestamps.add(point.lu * 1000));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    return sortedTimestamps.map(timestamp => {
      const dataPoint: FormattedChartDataPoint = {
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      selectedEntityIds.forEach(id => {
        const entityHistory = historyData[id];
        if (entityHistory) {
          // Find the closest point in time or interpolate
          // For simplicity, using the exact match or last known if not available at this specific combined timestamp
          const point = entityHistory.find(p => p.lu * 1000 === timestamp);
          dataPoint[id] = point ? Number(point.s) : NaN; // Use NaN for missing data at this specific timestamp
        }
      });
      return dataPoint;
    }).filter(dp => 
        // Ensure at least one selected entity has data for this point
        selectedEntityIds.some(id => dp[id] !== undefined && !isNaN(Number(dp[id])))
    );
  };

  const fetchChartData = useCallback(async () => {
    if (selectedEntityIds.length === 0 || !apiUrl || !token) {
      setChartData([]);
      return;
    }

    setLoading(prev => ({ ...prev, chart: true }));
    try {
      const historyPromises = selectedEntityIds.map(id => mockFetchEntityHistory(id, apiUrl, token));
      const historiesArray = await Promise.all(historyPromises);
      
      const historiesMap: Record<string, EntityHistoryPoint[]> = {};
      selectedEntityIds.forEach((id, index) => {
        historiesMap[id] = historiesArray[index];
      });
      
      const formattedData = formatChartData(historiesMap);
      setChartData(formattedData);

    } catch (error) {
      console.error("Failed to fetch chart data:", error);
      toast({ variant: "destructive", title: "Chart Error", description: (error as Error).message });
    } finally {
      setLoading(prev => ({ ...prev, chart: false }));
    }
  }, [selectedEntityIds, apiUrl, token, toast]);


  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isConnected || selectedEntityIds.length === 0 || loading.chart) return;

    const interval = setInterval(() => {
      setChartData(prevData => {
        if (prevData.length === 0) return prevData; // Don't update if no initial data

        const newDataPoint: FormattedChartDataPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        
        selectedEntityIds.forEach(id => {
          const lastValue = prevData.length > 0 ? Number(prevData[prevData.length - 1][id]) : (Math.random() * 100);
          // Simulate slight change
          const change = (Math.random() - 0.5) * (lastValue * 0.05); // up to 5% change
          let newValue = lastValue + change;
          if (id.includes('humidity')) newValue = Math.max(0, Math.min(100, newValue)); // Clamp humidity
          
          newDataPoint[id] = parseFloat(newValue.toFixed(1));
        });

        const updatedData = [...prevData, newDataPoint];
        return updatedData.slice(-60); // Keep last 60 points
      });
    }, 5000); // Update every 5 seconds

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
