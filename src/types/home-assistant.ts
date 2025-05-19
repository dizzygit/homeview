
export interface EntityAttributes {
  friendly_name?: string;
  unit_of_measurement?: string;
  device_class?: string;
  icon?: string;
  [key: string]: any;
}

export interface Entity {
  entity_id: string;
  state: string;
  attributes: EntityAttributes;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface EntityHistoryPoint {
  lu: number; // Unix timestamp (last_updated) in seconds
  s: string | number; // state
}

export interface FormattedChartDataPoint {
  time: string; // Formatted time string for chart axis (e.g., "HH:mm:ss")
  fullTime?: string; // More detailed time string for table (e.g., "yyyy-MM-dd HH:mm:ss")
  [entityId: string]: number | string | undefined; // value for each entity
}

export type ChartConfig = {
  [key: string]: {
    label: string;
    color: string;
  };
};
