"use client";

import type { FC } from 'react';
import type { FormattedChartDataPoint, Entity, ChartConfig as AppChartConfig } from "@/types/home-assistant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, CartesianGrid, XAxis, YAxis, Line, LegendPayload } from "recharts";
import { LineChartIcon, Info } from 'lucide-react';

interface DynamicChartProps {
  data: FormattedChartDataPoint[];
  selectedEntities: Entity[];
  loading: boolean;
}

const chartColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const DynamicChart: FC<DynamicChartProps> = ({ data, selectedEntities, loading }) => {
  
  const chartConfig: AppChartConfig = selectedEntities.reduce((acc, entity, index) => {
    acc[entity.entity_id] = {
      label: entity.attributes.friendly_name || entity.entity_id,
      color: chartColors[index % chartColors.length],
    };
    return acc;
  }, {} as AppChartConfig);

  if (loading) {
    return (
      <Card className="flex-grow shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LineChartIcon className="h-6 w-6 text-primary" />
            Entity Chart
          </CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="h-[calc(100vh-20rem)] md:h-[calc(100vh-22rem)]">
           <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-md animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (selectedEntities.length === 0) {
    return (
      <Card className="flex-grow shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LineChartIcon className="h-6 w-6 text-primary" />
            Entity Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100vh-20rem)] md:h-[calc(100vh-22rem)] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">No entities selected</p>
            <p>Please select one or more entities from the list to display their history.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (data.length === 0 && selectedEntities.length > 0) {
    return (
      <Card className="flex-grow shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <LineChartIcon className="h-6 w-6 text-primary" />
             Entity Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100vh-20rem)] md:h-[calc(100vh-22rem)] flex items-center justify-center">
           <div className="text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p>There is no historical data for the selected entities in the chosen timeframe, or data is still loading.</p>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="flex-grow shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <LineChartIcon className="h-6 w-6 text-primary" />
          Entity Chart
        </CardTitle>
        <CardDescription>
          Showing history for {selectedEntities.map(e => e.attributes.friendly_name || e.entity_id).join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[calc(100vh-20rem)] md:h-[calc(100vh-22rem)]">
        <ChartContainer config={chartConfig as any} className="w-full h-full">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 5)} // Show HH:mm
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              // You might need a domain or allowDecimals based on data
            />
            <ChartTooltip
              cursor={true}
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {selectedEntities.map((entity) => (
              <Line
                key={entity.entity_id}
                dataKey={entity.entity_id}
                type="monotone"
                stroke={chartConfig[entity.entity_id]?.color || "#8884d8"}
                strokeWidth={2}
                dot={false}
                name={chartConfig[entity.entity_id]?.label || entity.entity_id}
                animationDuration={300} 
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default DynamicChart;
