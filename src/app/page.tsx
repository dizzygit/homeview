
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { NextPage } from 'next';
import { HomeIcon } from 'lucide-react';
import { subHours, format } from 'date-fns';

import EntityList from '@/components/homeview/EntityList';
import DynamicChart from '@/components/homeview/DynamicChart';
import DataTable from '@/components/homeview/DataTable';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Entity, FormattedChartDataPoint, EntityHistoryPoint, ChartConfig as AppChartConfig } from '@/types/home-assistant';

const HomeViewPage: NextPage = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [chartData, setChartData] = useState<FormattedChartDataPoint[]>([]);
  const [loading, setLoading] = useState({ entities: true, chart: false });
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { toast } = useToast();

  useEffect(() => {
    // Initialize dates on the client side to avoid hydration mismatch
    setStartDate(subHours(new Date(), 24));
    setEndDate(new Date());
  }, []);

  const fetchEntities = async () => {
    setLoading(prev => ({ ...prev, entities: true }));
    try {
      const response = await fetch('/api/homeassistant/entities', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch entities: ${response.statusText}`);
      }

      const fetchedEntities: Entity[] = await response.json();
      setEntities(fetchedEntities);
      if (fetchedEntities.length > 0) {
        toast({ title: "Entities Loaded", description: "Fetched entities from Home Assistant." });
      } else {
        toast({ variant: "default", title: "No Entities Found", description: "Connected, but no entities were returned." });
      }
    } catch (error) {
      console.error("Fetching entities failed:", error);
      toast({ variant: "destructive", title: "Entity Fetch Failed", description: (error as Error).message });
    } finally {
      setLoading(prev => ({ ...prev, entities: false }));
    }
  };

  useEffect(() => {
    fetchEntities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to set default selected entities
  useEffect(() => {
    if (entities.length > 0 && selectedEntityIds.length === 0) { // Only set defaults if no entities are selected yet
      const defaultFriendlyNames = [
        "Pingvin Temperatura na zewnątrz",
        "Esp32Termodht11 Salon temp"
      ];
      const idsToSelect: string[] = [];
      
      defaultFriendlyNames.forEach(friendlyName => {
        const entityToSelect = entities.find(e => e.attributes.friendly_name === friendlyName);
        if (entityToSelect) {
          idsToSelect.push(entityToSelect.entity_id);
        }
      });

      if (idsToSelect.length > 0) {
        setSelectedEntityIds(idsToSelect);
      }
    }
  }, [entities, selectedEntityIds]);


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
      if (isNaN(timestamp)) {
        console.warn("Invalid timestamp encountered in formatChartData:", timestamp);
        return null; 
      }
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
            const stateString = String(point.s).replace(',', '.');
            numericValue = parseFloat(stateString); // Use parseFloat for better parsing of "value unit" strings
          }
          dataPoint[id] = numericValue;
        } else {
          dataPoint[id] = NaN; 
        }
      });
      return dataPoint;
    }).filter(dp => dp !== null && 
        selectedEntityIds.some(id => dp[id] !== undefined && !isNaN(dp[id] as number))
    ) as FormattedChartDataPoint[]; 

    return formattedPoints;
  };

  const fetchChartData = useCallback(async () => {
    if (selectedEntityIds.length === 0 || !startDate || !endDate) {
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
  }, [selectedEntityIds, startDate, endDate, toast]);

  useEffect(() => {
    if (startDate && endDate && selectedEntityIds.length > 0) {
      fetchChartData();
    } else if (selectedEntityIds.length === 0) {
      setChartData([]); 
    }
  }, [fetchChartData, startDate, endDate, selectedEntityIds]); 

  useEffect(() => {
    if (selectedEntityIds.length === 0 || loading.chart || !startDate || !endDate) return;

    const interval = setInterval(() => {
      if (startDate && endDate) {
         fetchChartData();
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, [selectedEntityIds, loading.chart, fetchChartData, startDate, endDate]);
  
  const namedChartColors = [
    "red", "green", "blue", "purple", "orange", 
    "teal", "magenta", "brown", "lime", "cyan",
    "navy", "olive", "maroon", "indigo", "gold" 
  ];

  const appChartConfig: AppChartConfig = entities
    .filter(e => selectedEntityIds.includes(e.entity_id))
    .reduce((acc, entity, index) => {
      acc[entity.entity_id] = {
        label: entity.attributes.friendly_name || entity.entity_id,
        color: namedChartColors[index % namedChartColors.length],
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
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6">
        {loading.entities && entities.length === 0 ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <p className="text-lg text-muted-foreground">Loading entities...</p>
            </div>
        ) : !loading.entities && entities.length === 0 ? (
             <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <p className="text-lg text-red-500">Failed to load entities. Please check server configuration.</p>
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
                chartConfig={appChartConfig}
                loading={loading.chart}
              />
              <DataTable
                data={chartData.map(dp => ({...dp, time: dp.fullTime || dp.time }))} 
                selectedEntities={entities.filter(e => selectedEntityIds.includes(e.entity_id))}
                chartConfig={appChartConfig}
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
    

    

    