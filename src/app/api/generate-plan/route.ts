import { NextRequest, NextResponse } from 'next/server';
import { generateProceduralPlan, SYSTEM_PROMPT } from '../../../utils/aiGenerator';
import { DesignConfig } from '../../../types/designer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, userApiKey } = body;

    if (!config) {
      return NextResponse.json({ error: 'Missing design configuration' }, { status: 400 });
    }

    const apiKey = userApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Graceful fallback to procedural generator
      console.log('No OpenAI API Key found. Using procedural fallback generator.');
      const plan = generateProceduralPlan(config as DesignConfig);
      return NextResponse.json({ plan, fallback: true });
    }

    // Call OpenAI Chat Completion
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective and fast
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Generate a custom layout for a ${config.style} style house.
Plot size: ${config.plotWidth} ft width x ${config.plotLength} ft length.
Bedrooms: ${config.bedrooms}, Bathrooms: ${config.bathrooms}.
Budget: $${config.budget}.
Special requirements: ${config.requirements.join(', ')}.`
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', errText);
      throw new Error(`OpenAI API failed: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    const parsedPlan = JSON.parse(resultText);

    // Ensure plan has unique IDs for all elements
    const plan = {
      ...parsedPlan,
      id: Math.random().toString(36).substring(2, 9),
      config,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ plan, fallback: false });
  } catch (error: any) {
    console.error('Plan generation failed, invoking procedural fallback:', error);
    // Even if OpenAI fails (invalid key, rate limit, parse error), we fall back gracefully
    try {
      const body = await req.json().catch(() => ({}));
      const config = body.config || {
        style: 'Modern',
        budget: 150000,
        bedrooms: 2,
        bathrooms: 2,
        plotWidth: 30,
        plotLength: 50,
        requirements: []
      };
      const plan = generateProceduralPlan(config as DesignConfig);
      return NextResponse.json({ plan, fallback: true, error: error.message });
    } catch (fallbackError: any) {
      return NextResponse.json({ error: 'Failed to generate layout: ' + fallbackError.message }, { status: 500 });
    }
  }
}
