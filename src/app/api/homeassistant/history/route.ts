
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { EntityHistoryPoint } from '@/types/home-assistant';

export async function POST(request: NextRequest) {
  let entityIdForLogging: string | undefined;
  try {
    const { entityId, startDateISO, endDateISO } = await request.json();
    const homeAssistantUrl = "https://n74elq0ugf4ac6p1c62jzifjzl9x0m5z.ui.nabu.casa";
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIyOGU5MjI3N2NmZWY0MTdhOTYwNTBiODllMTViYWNiNiIsImlhdCI6MTc0NzY1NTcxNSwiZXhwIjoyMDYzMDE1NzE1fQ.MedyEC-u6lDJsL98Es-WHdnxSsIk3V4VwY4lJEAQXUw";

    entityIdForLogging = entityId;

    if (!entityId || !startDateISO || !endDateISO) {
      return NextResponse.json({ error: 'Missing entityId, Start Date, or End Date' }, { status: 400 });
    }

    const normalizedUrl = homeAssistantUrl.replace(/\/$/, ""); // Remove trailing slash

    const historyUrl = `${normalizedUrl}/api/history/period/${startDateISO}?filter_entity_id=${entityId}&end_time=${endDateISO}&minimal_response`;

    const response = await fetch(historyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorData = 'An unknown error occurred';
       try {
        const textError = await response.text();
        try {
            const jsonError = JSON.parse(textError);
            errorData = jsonError.message || textError;
        } catch (e) {
            errorData = textError;
        }
      } catch (e) {
        // ignore
      }
      console.error(`HA API Error (history for ${entityId}):`, response.status, errorData, historyUrl);
      return NextResponse.json({ error: `Home Assistant API Error fetching history for ${entityId} (${response.status}): ${errorData}` }, { status: response.status });
    }

    const haResponseData: any = await response.json();
    let rawPointsList: any[] = [];

    if (Array.isArray(haResponseData) && haResponseData.length > 0 && Array.isArray(haResponseData[0])) {
      rawPointsList = haResponseData[0] || [];
    } else if (Array.isArray(haResponseData)) {
      rawPointsList = haResponseData;
    } else {
      console.warn(`Unexpected history format from Home Assistant for ${entityId}:`, haResponseData);
    }

    const processedHistory: EntityHistoryPoint[] = rawPointsList.map((p: any) => {
      let timestampInSeconds: number | undefined = undefined;
      const stateValue = p.s !== undefined ? String(p.s) : (p.state !== undefined ? String(p.state) : undefined);

      if (typeof p.lu === 'number') {
        timestampInSeconds = p.lu;
      } else if (typeof p.last_updated === 'string') {
        timestampInSeconds = new Date(p.last_updated).getTime() / 1000;
      } else if (typeof p.last_changed === 'string') {
        timestampInSeconds = new Date(p.last_changed).getTime() / 1000;
      }

      if (stateValue === undefined || timestampInSeconds === undefined || isNaN(timestampInSeconds)) {
        return null;
      }
      return { s: stateValue, lu: timestampInSeconds };
    }).filter(p => p !== null) as EntityHistoryPoint[];

    processedHistory.sort((a, b) => a.lu - b.lu);

    return NextResponse.json(processedHistory);
  } catch (error) {
    console.error(`Error in /api/homeassistant/history for ${entityIdForLogging || 'unknown entity'}:`, error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Internal Server Error fetching entity history', details: message }, { status: 500 });
  }
}
