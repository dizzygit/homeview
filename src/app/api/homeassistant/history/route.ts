
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { EntityHistoryPoint } from '@/types/home-assistant';

export async function POST(request: NextRequest) {
  let entityIdForLogging: string | undefined;
  try {
    const { entityId, homeAssistantUrl, token } = await request.json();
    entityIdForLogging = entityId;

    if (!entityId || !homeAssistantUrl || !token) {
      return NextResponse.json({ error: 'Missing entityId, Home Assistant URL, or Token' }, { status: 400 });
    }

    const normalizedUrl = homeAssistantUrl.replace(/\/$/, ""); // Remove trailing slash

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // 1 hour ago

    // HA API expects ISO string for history period
    // Example: /api/history/period/2021-08-30T10:00:00Z?filter_entity_id=sensor.temperature&end_time=2021-08-30T11:00:00Z
    const historyUrl = `${normalizedUrl}/api/history/period/${startDate.toISOString()}?filter_entity_id=${entityId}&end_time=${endDate.toISOString()}&minimal_response`;
    
    const response = await fetch(historyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data
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
      console.error(`HA API Error (history for ${entityId}):`, response.status, errorData);
      return NextResponse.json({ error: `Home Assistant API Error fetching history for ${entityId} (${response.status}): ${errorData}` }, { status: response.status });
    }
    
    const historyResponse: EntityHistoryPoint[][] = await response.json();
    // If the entity has no history, HA returns an empty array for that entity: `[[]]` if one entity, or `[]` if no data at all for any requested.
    // Or it can be `[[{...}, {...}]]`
    const entityHistory = historyResponse.length > 0 ? (historyResponse[0] || []) : [];


    return NextResponse.json(entityHistory);
  } catch (error) {
    console.error(`Error in /api/homeassistant/history for ${entityIdForLogging || 'unknown entity'}:`, error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Internal Server Error fetching entity history', details: message }, { status: 500 });
  }
}
