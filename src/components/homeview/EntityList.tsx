"use client";

import type { FC } from 'react';
import type { Entity } from "@/types/home-assistant";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getEntityIcon } from '@/lib/home-assistant-icons';
import { ListTree } from 'lucide-react';

interface EntityListProps {
  entities: Entity[];
  selectedEntityIds: string[];
  onSelectionChange: (entityId: string, selected: boolean) => void;
  loading: boolean;
}

const EntityList: FC<EntityListProps> = ({ entities, selectedEntityIds, onSelectionChange, loading }) => {
  if (loading) {
    return (
      <Card className="flex-shrink-0 w-full md:w-1/3 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListTree className="h-6 w-6 text-primary" />
            Entities
          </CardTitle>
          <CardDescription>Loading entities from Home Assistant...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2 p-2 rounded-md animate-pulse bg-muted/50 h-10" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (entities.length === 0) {
    return (
       <Card className="flex-shrink-0 w-full md:w-1/3 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListTree className="h-6 w-6 text-primary" />
            Entities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>No entities found or failed to load entities.</p>
        </CardContent>
      </Card>
    );
  }

  // Filter for entities that are likely to have numerical history (sensors)
  const relevantEntities = entities.filter(entity => {
    const domain = entity.entity_id.split('.')[0];
    return domain === 'sensor' && !isNaN(parseFloat(entity.state));
  });


  return (
    <Card className="flex-shrink-0 w-full md:w-1/3 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ListTree className="h-6 w-6 text-primary" />
          Select Entities
        </CardTitle>
        <CardDescription>Choose sensors to display on the chart. Only numerical sensors are shown.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)] md:h-[calc(100vh-22rem)] pr-3">
          {relevantEntities.length > 0 ? relevantEntities.map((entity) => (
            <div key={entity.entity_id} className="flex items-center space-x-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                id={entity.entity_id}
                checked={selectedEntityIds.includes(entity.entity_id)}
                onCheckedChange={(checked) => onSelectionChange(entity.entity_id, !!checked)}
                aria-label={`Select ${entity.attributes.friendly_name || entity.entity_id}`}
              />
              <div className="text-primary flex-shrink-0 w-5 h-5">
                 {getEntityIcon(entity)}
              </div>
              <Label htmlFor={entity.entity_id} className="flex-grow cursor-pointer text-sm">
                {entity.attributes.friendly_name || entity.entity_id}
                <span className="ml-2 text-xs text-muted-foreground">({entity.state} {entity.attributes.unit_of_measurement || ''})</span>
              </Label>
            </div>
          )) : <p className="text-muted-foreground p-2">No numerical sensor entities found to display.</p>}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default EntityList;
