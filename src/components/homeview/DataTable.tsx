
"use client";

import type { FC } from 'react';
import type { FormattedChartDataPoint, Entity, ChartConfig as AppChartConfig } from "@/types/home-assistant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableIcon, Info } from 'lucide-react';

interface DataTableProps {
  data: FormattedChartDataPoint[];
  selectedEntities: Entity[];
  chartConfig: AppChartConfig; // To get labels and colors if needed for consistency
  loading: boolean;
}

const DataTable: FC<DataTableProps> = ({ data, selectedEntities, chartConfig, loading }) => {
  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TableIcon className="h-6 w-6 text-primary" />
            Data Table
          </CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-md animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (selectedEntities.length === 0) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TableIcon className="h-6 w-6 text-primary" />
            Data Table
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Info className="h-10 w-10 mx-auto mb-3" />
            <p className="text-md font-medium">No entities selected</p>
            <p className="text-sm">Select entities to view their data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (data.length === 0 && selectedEntities.length > 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TableIcon className="h-6 w-6 text-primary" />
            Data Table
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Info className="h-10 w-10 mx-auto mb-3" />
            <p className="text-md font-medium">No data available</p>
            <p className="text-sm">No historical data for the selected entities in this time range.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TableIcon className="h-6 w-6 text-primary" />
          Data Table
        </CardTitle>
        <CardDescription>
          Showing data for {selectedEntities.map(e => chartConfig[e.entity_id]?.label || e.entity_id).join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72"> {/* Adjust height as needed */}
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[150px]">Time</TableHead>
                {selectedEntities.map(entity => (
                  <TableHead key={entity.entity_id}>
                    {chartConfig[entity.entity_id]?.label || entity.entity_id}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell className="font-medium">{row.time}</TableCell>
                  {selectedEntities.map(entity => (
                    <TableCell key={entity.entity_id}>
                      {typeof row[entity.entity_id] === 'number' && !isNaN(row[entity.entity_id] as number) 
                        ? (row[entity.entity_id] as number).toFixed(2) 
                        : row[entity.entity_id] === undefined || row[entity.entity_id] === null || isNaN(row[entity.entity_id] as number)
                        ? 'N/A' 
                        : String(row[entity.entity_id])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DataTable;
