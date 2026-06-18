import { NextRequest, NextResponse } from 'next/server';
import { getMockVariations } from '../../../utils/aiGenerator';
import { DesignStyle } from '../../../types/designer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, style, userApiKey } = body;

    const apiKey = userApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.log('No OpenAI API Key found for image generation. Returning stock fallback.');
      const mocks = getMockVariations((style || 'Modern') as DesignStyle);
      // Pick a random mock or return the first one
      const selected = mocks[Math.floor(Math.random() * mocks.length)];
      return NextResponse.json({
        imageUrl: selected.imageUrl,
        name: selected.name,
        description: selected.description,
        fallback: true
      });
    }

    // Call OpenAI DALL-E API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt || `High-quality photorealistic architectural render of a ${style || 'Modern'} house interior design, detailed furniture, volumetric lighting.`,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DALL-E API error:', errText);
      throw new Error(`DALL-E API failed: ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    return NextResponse.json({
      imageUrl,
      name: `AI Generated ${style || 'Modern'} Render`,
      description: prompt || 'DALL-E generated layout illustration.',
      fallback: false
    });
  } catch (error: any) {
    console.error('Image generation failed, using fallback:', error);
    const body = await req.json().catch(() => ({}));
    const style = body.style || 'Modern';
    const mocks = getMockVariations(style as DesignStyle);
    const selected = mocks[0];
    return NextResponse.json({
      imageUrl: selected.imageUrl,
      name: selected.name,
      description: selected.description,
      fallback: true,
      error: error.message
    });
  }
}
