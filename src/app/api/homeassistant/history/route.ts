
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { EntityHistoryPoint } from '@/types/home-assistant';

export async function POST(request: NextRequest) {
  let entityIdForLogging: string | undefined;
  let historyUrlForLogging: string | undefined; // For logging in catch block

  try {
    const { entityId, startDateISO, endDateISO } = await request.json();
    entityIdForLogging = entityId;

    const homeAssistantUrl = process.env.HOME_ASSISTANT_URL;
    const token = process.env.HOME_ASSISTANT_TOKEN;

    if (!homeAssistantUrl || !token) {
        console.error('[History API] Missing HOME_ASSISTANT_URL or HOME_ASSISTANT_TOKEN in environment variables for history endpoint');
        return NextResponse.json({ error: 'Server configuration error: Missing Home Assistant credentials.' }, { status: 500 });
    }

    if (!entityId || !startDateISO || !endDateISO) {
      return NextResponse.json({ error: 'Missing entityId, Start Date, or End Date from request' }, { status: 400 });
    }

    const normalizedUrl = homeAssistantUrl.replace(/\/$/, ""); // Remove trailing slash

    const constructedHistoryUrl = `${normalizedUrl}/api/history/period/${startDateISO}?filter_entity_id=${entityId}&end_time=${endDateISO}&minimal_response`;
    historyUrlForLogging = constructedHistoryUrl;
    
    console.log(`[History API] Attempting to fetch URL: ${constructedHistoryUrl}`);

    const response = await fetch(constructedHistoryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorData = `Home Assistant API returned status ${response.status}`;
       try {
        const textError = await response.text();
        try {
            const jsonError = JSON.parse(textError);
            errorData = jsonError.message || textError || errorData;
        } catch (e) {
            errorData = textError || errorData;
        }
      } catch (e) {
        // ignore if can't read body, errorData will retain the status message
      }
      console.error(`[History API] HA API Error for entity ${entityId} (${response.status}): ${errorData}. URL: ${constructedHistoryUrl}`);
      return NextResponse.json({ error: `Home Assistant API Error fetching history for ${entityId}`, details: `(${response.status}) ${errorData}` }, { status: response.status });
    }

    let haResponseData: any;
    try {
      haResponseData = await response.json();
    } catch (jsonError: any) {
      console.error(`[History API] Error parsing JSON response from Home Assistant for ${entityId}. URL: ${constructedHistoryUrl}. Error: ${jsonError.message}`);
      const responseText = await response.text().catch(() => "Could not read response text.");
      console.error(`[History API] HA Response text for ${entityId}: ${responseText.substring(0, 500)}`);
      return NextResponse.json({ error: `Failed to parse JSON response from Home Assistant for ${entityId}.`, details: `Response text: ${responseText.substring(0, 200)}` }, { status: 500 });
    }
    
    let rawPointsList: any[] = [];

    if (Array.isArray(haResponseData) && haResponseData.length > 0 && Array.isArray(haResponseData[0])) {
      rawPointsList = haResponseData[0] || [];
    } else if (Array.isArray(haResponseData)) {
      rawPointsList = haResponseData;
    } else {
      console.warn(`[History API] Unexpected history format from Home Assistant for ${entityId}. URL: ${constructedHistoryUrl}. Data:`, haResponseData);
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
    let detailMessage = "An unexpected error occurred on the server while fetching history.";
    if (error instanceof Error) {
        detailMessage = error.message;
        console.error(
            `[History API Critical Error] For entity: ${entityIdForLogging || 'unknown'}. ` +
            `URL: ${historyUrlForLogging || 'URL not constructed or unavailable'}. ` +
            `Message: ${error.message}. Stack: ${error.stack}`
        );
    } else {
        console.error(
            `[History API Critical Error] For entity: ${entityIdForLogging || 'unknown'}. ` +
            `URL: ${historyUrlForLogging || 'URL not constructed or unavailable'}. Non-error object thrown:`, error
        );
    }
    
    return NextResponse.json({ 
      error: 'Server error while fetching entity history.', 
      details: detailMessage 
    }, { status: 500 });
  }
}
