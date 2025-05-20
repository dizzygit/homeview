
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Entity } from '@/types/home-assistant';

export async function POST(request: NextRequest) {
  try {
    const homeAssistantUrl = "https://n74elq0ugf4ac6p1c62jzifjzl9x0m5z.ui.nabu.casa";
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIyOGU5MjI3N2NmZWY0MTdhOTYwNTBiODllMTViYWNiNiIsImlhdCI6MTc0NzY1NTcxNSwiZXhwIjoyMDYzMDE1NzE1fQ.MedyEC-u6lDJsL98Es-WHdnxSsIk3V4VwY4lJEAQXUw";

    const normalizedUrl = homeAssistantUrl.replace(/\/$/, ""); // Remove trailing slash if present

    const response = await fetch(`${normalizedUrl}/api/states`, {
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
        // ignore if can't read body
      }
      console.error('HA API Error (entities):', response.status, errorData);
      return NextResponse.json({ error: `Home Assistant API Error (${response.status}): ${errorData}` }, { status: response.status });
    }

    const entities: Entity[] = await response.json();
    return NextResponse.json(entities);
  } catch (error) {
    console.error('Error in /api/homeassistant/entities:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Internal Server Error fetching entities', details: message }, { status: 500 });
  }
}
