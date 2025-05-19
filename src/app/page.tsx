
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { NextPage } from 'next';
import { HomeIcon, LogOut } from 'lucide-react';
import { subHours, format } from 'date-fns';

import ConnectionForm from '@/components/homeview/ConnectionForm';
import type { ConnectionFormValues } from '@/components/homeview/ConnectionForm';
import EntityList from '@/components/homeview/EntityList';
import DynamicChart from '@/components/homeview/DynamicChart';
import DataTable from '@/components/homeview/DataTable'; // Import DataTable
import { DatePicker } from '@/components/ui/date-picker'; // Import DatePicker
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Entity, FormattedChartDataPoint, EntityHistoryPoint, ChartConfig as AppChartConfig } from '@/types/home-assistant';

const HomeViewPage: NextPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [homeAssistantUrl, setHomeAssistantUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [chartData, setChartData] = useState<FormattedChartDataPoint[]>([]);
  const [loading, setLoading] = useState({ connect: false, entities: false, chart: false });
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { toast } = useToast();

  useEffect(() => {
    // Initialize dates on the client side to avoid hydration mismatch
    setStartDate(subHours(new Date(), 24));
    setEndDate(new Date());
  }, []);

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
    // Reset dates to initial client-side defaults
    setStartDate(subHours(new Date(), 24));
    setEndDate(new Date());
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
      if (Array.isArray(entityHistoryList)) {
        entityHistoryList.forEach(point => {
          if (point && typeof point.lu === 'number' && !isNaN(point.lu)) {
            allTimestamps.add(point.lu * 1000); 
          }
        });
      }
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    const formattedPoints = sortedTimestamps.map(timestamp => {
      const dataPoint: FormattedChartDataPoint = {
        time: format(new Date(timestamp), "HH:mm:ss"), 
        fullTime: format(new Date(timestamp), "yyyy-MM-dd HH:mm:ss"), 
      };
      selectedEntityIds.forEach(id => {
        const entityHistory = historyData[id];
        if (entityHistory) {
          const point = entityHistory.find(p => p.lu * 1000 === timestamp);
          
          let numericValue = NaN;
          if (point && point.s !== null && point.s !== undefined) {
            const stateString = String(point.s);
            // Use parseFloat for more robust parsing, e.g. "22.5 °C" -> 22.5
            // Also handles comma decimal separators after replacing.
            numericValue = parseFloat(stateString.replace(',', '.'));
          }
          dataPoint[id] = numericValue;
        } else {
          dataPoint[id] = NaN; 
        }
      });
      return dataPoint;
    });

    // Filter out rows where ALL selected entities have NaN values for that timestamp
    return formattedPoints.filter(dp => 
        selectedEntityIds.some(id => dp[id] !== undefined && !isNaN(dp[id] as number))
    );
  };

  const fetchChartData = useCallback(async () => {
    if (selectedEntityIds.length === 0 || !homeAssistantUrl || !token || !startDate || !endDate) {
      setChartData([]);
      return;
    }
    if (startDate > endDate) {
        toast({ variant: "destructive", title: "Date Error", description: "Start date cannot be after end date."});
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
            startDateISO: startDate.toISOString(),
            endDateISO: endDate.toISOString(),
          }),
        });
        if (!response.ok) {
          let errorDetails = `Status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetails = errorData.error || errorData.message || JSON.stringify(errorData);
          } catch (e) {
             try { errorDetails = await response.text(); } catch (fetchError) { console.error("Error reading response text:", fetchError)}
          }
          console.error(`Failed to fetch history for ${id}: ${errorDetails}`);
          throw new Error(`Failed to fetch history for ${id}. Details: ${errorDetails.substring(0,100)}`);
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
  }, [selectedEntityIds, homeAssistantUrl, token, startDate, endDate, toast]);

  useEffect(() => {
    if (startDate && endDate && selectedEntityIds.length > 0) {
      fetchChartData();
    } else if (selectedEntityIds.length === 0) {
      setChartData([]); 
    }
  }, [fetchChartData, startDate, endDate, selectedEntityIds]); 

  useEffect(() => {
    if (!isConnected || selectedEntityIds.length === 0 || loading.chart || !startDate || !endDate) return;

    const interval = setInterval(() => {
      if (startDate && endDate) {
         fetchChartData();
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, [isConnected, selectedEntityIds, loading.chart, fetchChartData, startDate, endDate]);
  
  const chartConfig: AppChartConfig = entities
    .filter(e => selectedEntityIds.includes(e.entity_id))
    .reduce((acc, entity, index) => {
      const chartColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
      acc[entity.entity_id] = {
        label: entity.attributes.friendly_name || entity.entity_id,
        color: chartColors[index % chartColors.length],
      };
      return acc;
    }, {} as AppChartConfig);


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
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="lg:col-span-3"> 
              <EntityList
                entities={entities}
                selectedEntityIds={selectedEntityIds}
                onSelectionChange={handleEntitySelectionChange}
                loading={loading.entities}
              />
            </div>
            <div className="lg:col-span-4 space-y-6"> 
              <div className="flex flex-col sm:flex-row gap-4 items-center p-4 border rounded-lg bg-card shadow">
                <DatePicker date={startDate} setDate={setStartDate} placeholder="Start Date & Time" disabled={loading.chart || !startDate} className="w-full sm:w-auto"/>
                <DatePicker date={endDate} setDate={setEndDate} placeholder="End Date & Time" disabled={loading.chart || !endDate} className="w-full sm:w-auto"/>
                <Button 
                  onClick={() => {
                    if (startDate && endDate) fetchChartData();
                  }} 
                  disabled={loading.chart || selectedEntityIds.length === 0 || !startDate || !endDate} 
                  className="w-full sm:w-auto"
                >
                  {loading.chart ? "Refreshing..." : "Refresh Data"}
                </Button>
              </div>
              <DynamicChart
                data={chartData}
                selectedEntities={entities.filter(e => selectedEntityIds.includes(e.entity_id))}
                loading={loading.chart}
              />
              <DataTable
                data={chartData.map(dp => ({...dp, time: dp.fullTime || dp.time }))} 
                selectedEntities={entities.filter(e => selectedEntityIds.includes(e.entity_id))}
                chartConfig={chartConfig}
                loading={loading.chart}
              />
            </div>
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

