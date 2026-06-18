import { DesignConfig, HousePlan, Room, Furniture, MaterialPalette, CostEstimate, VastuReport, RoomType, FurnitureType, DesignStyle, DesignVariation } from '../types/designer';

// Simple helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// System prompt for OpenAI layout generation
export const SYSTEM_PROMPT = `You are an expert architectural AI assistant. Your task is to design a high-quality, professional, 2D floor plan for a house based on user requirements. 
You must return your output ONLY as a valid JSON object matching the TypeScript interfaces provided. Do not write any markdown explanation or wrap the JSON in triple backticks.

The coordinate system:
- The plot starts at (0,0) at the bottom-left corner and extends to (plotWidth, plotLength) at the top-right.
- W is the width of the plot (x-axis), L is the length of the plot (y-axis).
- All rooms must fit inside the plot (0 <= x + width <= plotWidth and 0 <= y + height <= plotLength) without overlaps.
- All rooms must have realistic sizes (e.g. Master Bedroom: 12x14ft to 16x20ft, Bathroom: 6x8ft to 8x10ft, Kitchen: 10x12ft to 12x16ft, Living Room: 16x18ft to 20x24ft).
- Furniture items should be placed inside their respective rooms with appropriate coordinates, widths, heights, and rotations (0, 90, 180, or 270 degrees).

Your response must strictly follow this JSON schema:
{
  "name": "Name of the House Plan",
  "rooms": [
    { "id": "string", "name": "Room Name", "type": "living|bedroom|bathroom|kitchen|office|gym|garden|pool|garage|hallway", "x": number, "y": number, "width": number, "height": number, "color": "hex_color" }
  ],
  "furniture": [
    { "id": "string", "name": "Furniture Name", "type": "bed|sofa|table|chair|tv|desk|toilet|shower|sink|fridge|stove|plant|car|pool_chair", "x": number, "y": number, "width": number, "height": number, "rotation": number }
  ],
  "materialPalette": {
    "wallColor": "hex_color",
    "wallMaterial": "Drywall / Painted Concrete / Wood Paneling",
    "floorColor": "hex_color",
    "floorMaterial": "Hardwood / Marble / Ceramic Tile / Polished Concrete",
    "furnitureStyle": "Modern / Minimalist / Luxury / Traditional Wood",
    "roofStyle": "Flat / Sloped / Gable"
  },
  "costEstimate": {
    "totalCost": number,
    "costPerSqFt": number,
    "categories": [
      { "name": "string", "cost": number, "percentage": number, "notes": "string" }
    ]
  },
  "vastuReport": {
    "score": number,
    "items": [
      { "rule": "string", "status": "passed|warning|info", "message": "string" }
    ]
  }
}`;

// Helper to estimate cost based on configuration
export function calculateCostEstimate(config: DesignConfig): CostEstimate {
  const area = config.plotWidth * config.plotLength;
  
  // Base rates per sq ft based on style
  let baseRate = 150; // Minimalist
  if (config.style === 'Modern') baseRate = 180;
  if (config.style === 'Traditional') baseRate = 165;
  if (config.style === 'Luxury') baseRate = 280;

  // Add cost for rooms
  const totalCost = area * baseRate;
  const costPerSqFt = baseRate;

  const categories = [
    {
      name: 'Foundation & Framing',
      cost: totalCost * 0.35,
      percentage: 35,
      notes: 'Excavation, concrete slab, wooden/steel framing, exterior walls.'
    },
    {
      name: 'Interior Finishes',
      cost: totalCost * 0.25,
      percentage: 25,
      notes: `Premium ${config.style.toLowerCase()} wall paint, flooring (${config.style === 'Luxury' ? 'Italian Marble' : 'Hardwood'}), doors.`
    },
    {
      name: 'MEP (Mechanical, Electrical, Plumbing)',
      cost: totalCost * 0.20,
      percentage: 20,
      notes: 'Wiring, fixtures, plumbing lines, smart home hubs, heating and cooling system.'
    },
    {
      name: 'Exterior, Roof & Windows',
      cost: totalCost * 0.12,
      percentage: 12,
      notes: 'Weatherproofing, roofing, double-glazed windows, painting.'
    },
    {
      name: 'Permits & Builder Fees',
      cost: totalCost * 0.08,
      percentage: 8,
      notes: 'Local municipal approvals, architect design fees, contractor management fee.'
    }
  ];

  return {
    totalCost: Math.round(totalCost),
    costPerSqFt: Math.round(costPerSqFt),
    categories
  };
}

// Helper to evaluate Vastu/Feng Shui
export function evaluateVastuReport(rooms: Room[], config: DesignConfig): VastuReport {
  const items: { rule: string; status: 'passed' | 'warning' | 'info'; message: string }[] = [];
  let score = 100;

  // Check Master Bedroom placement
  // Vastu: Master Bedroom should be in South-West (bottom-left)
  const masterBed = rooms.find(r => r.type === 'bedroom' && r.name.toLowerCase().includes('master'));
  if (masterBed) {
    const isSouthWest = masterBed.x <= config.plotWidth / 2 && masterBed.y <= config.plotLength / 2;
    if (isSouthWest) {
      items.push({
        rule: 'Master Bedroom Location',
        status: 'passed',
        message: 'Master bedroom is in the South-West corner, which promotes health, prosperity, and stability.'
      });
    } else {
      score -= 15;
      items.push({
        rule: 'Master Bedroom Location',
        status: 'warning',
        message: 'Master bedroom is not in the South-West. Relocating it to the South-West corner brings stability and peace.'
      });
    }
  }

  // Check Kitchen placement
  // Vastu: Kitchen should be in South-East (bottom-right) or North-West (top-left)
  const kitchen = rooms.find(r => r.type === 'kitchen');
  if (kitchen) {
    const isSouthEast = kitchen.x >= config.plotWidth / 2 && kitchen.y <= config.plotLength / 2;
    const isNorthWest = kitchen.x <= config.plotWidth / 2 && kitchen.y >= config.plotLength / 2;
    
    if (isSouthEast) {
      items.push({
        rule: 'Kitchen Location (Agni Corner)',
        status: 'passed',
        message: 'Kitchen is in the South-East corner (Fire zone), which is highly auspicious and brings vitality.'
      });
    } else if (isNorthWest) {
      items.push({
        rule: 'Kitchen Location (Vayu Corner)',
        status: 'passed',
        message: 'Kitchen is in the North-West (Air zone), which is a good secondary choice.'
      });
    } else {
      score -= 15;
      items.push({
        rule: 'Kitchen Location',
        status: 'warning',
        message: 'Kitchen is placed in a non-ideal zone. Try positioning it in the South-East corner to align with the fire element.'
      });
    }
  }

  // Check Entrance placement
  // Vastu: Main gate/entrance should be in North or East
  const living = rooms.find(r => r.type === 'living');
  if (living) {
    // Entrance is usually in living room
    const isNorthOrEast = living.y >= config.plotLength / 2 || living.x >= config.plotWidth / 2;
    if (isNorthOrEast) {
      items.push({
        rule: 'Main Entrance Flow',
        status: 'passed',
        message: 'Main entrance opens towards East/North, welcoming positive energy flow (Prana).'
      });
    } else {
      score -= 10;
      items.push({
        rule: 'Main Entrance Flow',
        status: 'info',
        message: 'Entrance opens towards South/West. Place a brass pyramid or Vastu crystals at the threshold to balance energy.'
      });
    }
  }

  // Check Bathrooms
  // Vastu: Bathrooms should be in West or North-West, not in Center or North-East
  const bathrooms = rooms.filter(r => r.type === 'bathroom');
  bathrooms.forEach((bath, index) => {
    const isNorthEast = bath.x >= config.plotWidth / 2 && bath.y >= config.plotLength / 2;
    const isCenter = bath.x > config.plotWidth * 0.3 && bath.x < config.plotWidth * 0.7 &&
                     bath.y > config.plotLength * 0.3 && bath.y < config.plotLength * 0.7;

    if (isNorthEast) {
      score -= 15;
      items.push({
        rule: `Bathroom #${index + 1} Position`,
        status: 'warning',
        message: `Bathroom #${index + 1} is in the North-East. Avoid bathrooms here as it contaminates the sacred water/air sector.`
      });
    } else if (isCenter) {
      score -= 20;
      items.push({
        rule: `Bathroom #${index + 1} Position`,
        status: 'warning',
        message: `Bathroom #${index + 1} is in the Center (Brahmasthan). The center of the house must remain open and free of plumbing.`
      });
    } else {
      items.push({
        rule: `Bathroom #${index + 1} Position`,
        status: 'passed',
        message: `Bathroom #${index + 1} is placed in a suitable zone (${bath.x < config.plotWidth/2 ? 'West' : 'East'} side).`
      });
    }
  });

  // Plot ratio health
  const ratio = config.plotLength / config.plotWidth;
  if (ratio > 2 || ratio < 0.5) {
    score -= 10;
    items.push({
      rule: 'Plot Shape Ratio',
      status: 'warning',
      message: 'Plot shape is highly elongated. Vastu favors square or rectangular plots (1:1 to 1:1.5 ratio) for balanced energies.'
    });
  } else {
    items.push({
      rule: 'Plot Shape Ratio',
      status: 'passed',
      message: 'Plot has a balanced rectangular proportion, aiding uniform distribution of magnetic forces.'
    });
  }

  return {
    score: Math.max(10, Math.min(100, score)),
    items
  };
}

// Procedural client-side generator for fallback
export function generateProceduralPlan(config: DesignConfig): HousePlan {
  const W = config.plotWidth;
  const L = config.plotLength;
  const rooms: Room[] = [];
  const furniture: Furniture[] = [];

  // 1. Establish material palette based on style
  let materialPalette: MaterialPalette = {
    wallColor: '#F3F4F6', // Off-white
    wallMaterial: 'Painted Drywall',
    floorColor: '#D1D5DB',
    floorMaterial: 'Polished Ceramic Tile',
    furnitureStyle: 'Modern Standard',
    roofStyle: 'Flat with Parapet'
  };

  if (config.style === 'Modern') {
    materialPalette = {
      wallColor: '#E5E7EB',
      wallMaterial: 'Polished Concrete & Teak Slats',
      floorColor: '#374151',
      floorMaterial: 'Polished Engineered Oak',
      furnitureStyle: 'Sleek Italian Design',
      roofStyle: 'Flat Cantilevered'
    };
  } else if (config.style === 'Minimalist') {
    materialPalette = {
      wallColor: '#FAFAFA',
      wallMaterial: 'White Plaster',
      floorColor: '#F5F5F7',
      floorMaterial: 'Light Maple Wood',
      furnitureStyle: 'Scandinavian Functionalist',
      roofStyle: 'Flat Minimalist'
    };
  } else if (config.style === 'Luxury') {
    materialPalette = {
      wallColor: '#F9F6F0',
      wallMaterial: 'Calacatta Marble & Velvet Panels',
      floorColor: '#ECE5C7',
      floorMaterial: 'Italian White Carrara Marble',
      furnitureStyle: 'Bespoke Velvet & Gold Accent',
      roofStyle: 'Deep Coffered / Gabled Ceiling'
    };
  } else if (config.style === 'Traditional') {
    materialPalette = {
      wallColor: '#FEF3C7',
      wallMaterial: 'Brick Accent & Stucco',
      floorColor: '#78350F',
      floorMaterial: 'Dark Walnut Parquet',
      furnitureStyle: 'Classic Chesterfield & Mahogany',
      roofStyle: 'Sloped Gabled Roof'
    };
  }

  // 2. Lay out rooms programmatically
  // We divide the length (L) into roughly 3 zones from back (y = 0) to front (y = L)
  // Zone A (Back, y = 0 to L*0.35)
  // Zone B (Middle, y = L*0.35 to L*0.7)
  // Zone C (Front, y = L*0.7 to L)
  
  // Let's reserve some space for a garden or pool if requested
  let frontGardenDepth = 0;
  let backPoolDepth = 0;
  
  if (config.requirements.includes('garden')) {
    frontGardenDepth = Math.min(10, L * 0.15); // e.g. 8-10 feet front yard
  }
  if (config.requirements.includes('pool')) {
    backPoolDepth = Math.min(12, L * 0.2); // e.g. 10-12 feet back yard
  }

  const buildableStartY = backPoolDepth;
  const buildableEndY = L - frontGardenDepth;
  const buildableLength = buildableEndY - buildableStartY;
  
  // Horizontal splits
  const leftX = 0;
  const midX = W * 0.55;
  const rightX = W;
  const midW1 = midX - leftX;
  const midW2 = rightX - midX;

  // Zone A (Back): Master Bedroom and Master Bath
  const zoneAY = buildableStartY;
  const zoneAHeight = buildableLength * 0.35;

  // Master Bed (South-West)
  const masterBedId = generateId();
  rooms.push({
    id: masterBedId,
    name: 'Master Bedroom',
    type: 'bedroom',
    x: leftX,
    y: zoneAY,
    width: W * 0.6,
    height: zoneAHeight,
    color: '#6366F1' // Indigo
  });

  // Furniture in Master Bedroom: Bed, Desk, Chair, TV
  const mBedX = leftX + (W * 0.3);
  const mBedY = zoneAY + (zoneAHeight * 0.5);
  furniture.push({
    id: generateId(),
    name: 'King Bed',
    type: 'bed',
    x: mBedX,
    y: zoneAY + 1.5,
    width: 6.5,
    height: 7,
    rotation: 0,
    roomId: masterBedId
  });

  furniture.push({
    id: generateId(),
    name: 'Work Desk',
    type: 'desk',
    x: leftX + 1.5,
    y: zoneAY + (zoneAHeight - 4),
    width: 4.5,
    height: 2.5,
    rotation: 90,
    roomId: masterBedId
  });

  furniture.push({
    id: generateId(),
    name: 'Desk Chair',
    type: 'chair',
    x: leftX + 3.2,
    y: zoneAY + (zoneAHeight - 3.25),
    width: 2,
    height: 2,
    rotation: 270,
    roomId: masterBedId
  });

  // Master Bath (adjacent to Master Bedroom)
  const masterBathId = generateId();
  rooms.push({
    id: masterBathId,
    name: 'Master Bath',
    type: 'bathroom',
    x: W * 0.6,
    y: zoneAY,
    width: W * 0.4,
    height: zoneAHeight * 0.6,
    color: '#3B82F6' // Blue
  });

  // Master bath furniture: Toilet, Shower, Sink
  furniture.push({
    id: generateId(),
    name: 'Toilet',
    type: 'toilet',
    x: W - 2,
    y: zoneAY + 1.5,
    width: 2,
    height: 2.5,
    rotation: 0,
    roomId: masterBathId
  });

  furniture.push({
    id: generateId(),
    name: 'Walk-in Shower',
    type: 'shower',
    x: W * 0.6 + 1.5,
    y: zoneAY + 1.5,
    width: 3.5,
    height: 3.5,
    rotation: 0,
    roomId: masterBathId
  });

  furniture.push({
    id: generateId(),
    name: 'Double Vanity',
    type: 'sink',
    x: W * 0.75,
    y: zoneAY + (zoneAHeight * 0.6) - 2,
    width: 5,
    height: 1.8,
    rotation: 180,
    roomId: masterBathId
  });

  // Zone B (Middle): Living Room & Kitchen
  const zoneBY = zoneAY + zoneAHeight;
  const zoneBHeight = buildableLength * 0.38;

  // Living Room (Center/West)
  const livingId = generateId();
  rooms.push({
    id: livingId,
    name: 'Living Room',
    type: 'living',
    x: leftX,
    y: zoneBY,
    width: W * 0.62,
    height: zoneBHeight,
    color: '#8B5CF6' // Purple
  });

  // Living Room Furniture: L-Sofa, Coffee Table, TV Console, Plants
  furniture.push({
    id: generateId(),
    name: 'Sectional Sofa',
    type: 'sofa',
    x: leftX + 4,
    y: zoneBY + (zoneBHeight * 0.4),
    width: 7.5,
    height: 6,
    rotation: 0,
    roomId: livingId
  });

  furniture.push({
    id: generateId(),
    name: 'Coffee Table',
    type: 'table',
    x: leftX + 8,
    y: zoneBY + (zoneBHeight * 0.4) + 1.5,
    width: 4,
    height: 2.5,
    rotation: 0,
    roomId: livingId
  });

  furniture.push({
    id: generateId(),
    name: 'Media Console & TV',
    type: 'tv',
    x: leftX + (W * 0.62) - 2,
    y: zoneBY + (zoneBHeight * 0.3),
    width: 1.5,
    height: 6,
    rotation: 90,
    roomId: livingId
  });

  // Kitchen (South-East / Zone B East)
  const kitchenId = generateId();
  rooms.push({
    id: kitchenId,
    name: 'Kitchen & Dining',
    type: 'kitchen',
    x: W * 0.62,
    y: zoneBY,
    width: W * 0.38,
    height: zoneBHeight,
    color: '#10B981' // Emerald
  });

  // Kitchen furniture: Counter/stove, Fridge, Dining table, Chairs
  furniture.push({
    id: generateId(),
    name: 'Kitchen Counter & Stove',
    type: 'stove',
    x: W - 1.8,
    y: zoneBY + 4,
    width: 1.8,
    height: 8,
    rotation: 90,
    roomId: kitchenId
  });

  furniture.push({
    id: generateId(),
    name: 'Double-door Fridge',
    type: 'fridge',
    x: W - 3.5,
    y: zoneBY + zoneBHeight - 2,
    width: 3,
    height: 2.8,
    rotation: 180,
    roomId: kitchenId
  });

  furniture.push({
    id: generateId(),
    name: 'Dining Table',
    type: 'table',
    x: W * 0.62 + 3,
    y: zoneBY + 2.5,
    width: 4.5,
    height: 3,
    rotation: 90,
    roomId: kitchenId
  });

  // Zone C (Front): Additional Bedroom(s), Office/Gym, Common Bath, Entrance Hallway
  const zoneCY = zoneBY + zoneBHeight;
  const zoneCHeight = buildableLength - zoneAHeight - zoneBHeight;

  // Let's allocate rooms in Zone C based on bedroom/bathroom and office config
  // Standard split: Left side: Bedroom 2. Right side: Office/Gym/Foyer & Bath
  let bed2Id = '';
  if (config.bedrooms > 1) {
    bed2Id = generateId();
    rooms.push({
      id: bed2Id,
      name: 'Bedroom 2',
      type: 'bedroom',
      x: leftX,
      y: zoneCY,
      width: W * 0.5,
      height: zoneCHeight,
      color: '#EC4899' // Pink
    });

    // Bed 2 furniture
    furniture.push({
      id: generateId(),
      name: 'Queen Bed',
      type: 'bed',
      x: leftX + 1.5,
      y: zoneCY + (zoneCHeight * 0.3),
      width: 6,
      height: 6.5,
      rotation: 90,
      roomId: bed2Id
    });
  }

  // Common Bath
  const commonBathId = generateId();
  const bathX = config.bedrooms > 1 ? W * 0.5 : W * 0.3;
  const bathW = W * 0.2;
  rooms.push({
    id: commonBathId,
    name: 'Common Bath',
    type: 'bathroom',
    x: bathX,
    y: zoneCY,
    width: bathW,
    height: zoneCHeight * 0.6,
    color: '#06B6D4' // Cyan
  });

  furniture.push({
    id: generateId(),
    name: 'Toilet',
    type: 'toilet',
    x: bathX + 1.5,
    y: zoneCY + 1.5,
    width: 2,
    height: 2.2,
    rotation: 0,
    roomId: commonBathId
  });

  furniture.push({
    id: generateId(),
    name: 'Sink',
    type: 'sink',
    x: bathX + bathW - 2,
    y: zoneCY + 1.5,
    width: 1.8,
    height: 1.8,
    rotation: 270,
    roomId: commonBathId
  });

  // Special Requirements: Home Office or Gym or Guest room
  const specialX = bathX + bathW;
  const specialW = W - specialX;
  
  if (config.requirements.includes('home office') || config.requirements.includes('gym')) {
    const specialType = config.requirements.includes('home office') ? 'office' : 'gym';
    const specialId = generateId();
    rooms.push({
      id: specialId,
      name: specialType === 'office' ? 'Home Office' : 'Fitness Gym',
      type: specialType,
      x: specialX,
      y: zoneCY,
      width: specialW,
      height: zoneCHeight,
      color: specialType === 'office' ? '#F59E0B' : '#EF4444' // Amber vs Red
    });

    if (specialType === 'office') {
      furniture.push({
        id: generateId(),
        name: 'Executive Desk',
        type: 'desk',
        x: specialX + 2,
        y: zoneCY + (zoneCHeight - 4),
        width: 5,
        height: 2.5,
        rotation: 180,
        roomId: specialId
      });
      furniture.push({
        id: generateId(),
        name: 'Office Chair',
        type: 'chair',
        x: specialX + 3.5,
        y: zoneCY + (zoneCHeight - 5.5),
        width: 2,
        height: 2,
        rotation: 0,
        roomId: specialId
      });
      furniture.push({
        id: generateId(),
        name: 'Lounge Sofa',
        type: 'sofa',
        x: W - 5,
        y: zoneCY + 1.5,
        width: 4.5,
        height: 2.2,
        rotation: 0,
        roomId: specialId
      });
    } else {
      // Gym equipment placeholders
      furniture.push({
        id: generateId(),
        name: 'Treadmill',
        type: 'desk', // Desk shape fits treadmill bounds
        x: specialX + 2,
        y: zoneCY + 2,
        width: 3,
        height: 5.5,
        rotation: 0,
        roomId: specialId
      });
      furniture.push({
        id: generateId(),
        name: 'Dumbbell Rack',
        type: 'table',
        x: W - 2,
        y: zoneCY + 2,
        width: 1.5,
        height: 5,
        rotation: 90,
        roomId: specialId
      });
    }
  } else {
    // If no office/gym, allocate a beautiful Entrance Foyer/Hallway
    const lobbyId = generateId();
    rooms.push({
      id: lobbyId,
      name: 'Entrance Foyer',
      type: 'hallway',
      x: specialX,
      y: zoneCY,
      width: specialW,
      height: zoneCHeight,
      color: '#6B7280' // Gray
    });
    
    furniture.push({
      id: generateId(),
      name: 'Foyer Console Table',
      type: 'table',
      x: specialX + 1,
      y: zoneCY + (zoneCHeight - 2.5),
      width: 4,
      height: 1.5,
      rotation: 180,
      roomId: lobbyId
    });
    furniture.push({
      id: generateId(),
      name: 'Foyer Armchair',
      type: 'chair',
      x: W - 3,
      y: zoneCY + (zoneCHeight - 3),
      width: 2,
      height: 2,
      rotation: 270,
      roomId: lobbyId
    });
  }

  // 3. Pool (Backyard)
  if (config.requirements.includes('pool') && backPoolDepth > 0) {
    const poolId = generateId();
    rooms.push({
      id: poolId,
      name: 'Swimming Pool',
      type: 'pool',
      x: W * 0.15,
      y: 1.5,
      width: W * 0.7,
      height: backPoolDepth - 2,
      color: '#0EA5E9' // Light Blue
    });

    furniture.push({
      id: generateId(),
      name: 'Pool Lounger 1',
      type: 'pool_chair',
      x: W * 0.05,
      y: 2,
      width: 2,
      height: 4.5,
      rotation: 0,
      roomId: poolId
    });

    furniture.push({
      id: generateId(),
      name: 'Pool Lounger 2',
      type: 'pool_chair',
      x: W * 0.88,
      y: 2,
      width: 2,
      height: 4.5,
      rotation: 0,
      roomId: poolId
    });
  }

  // 4. Garden (Frontyard)
  if (config.requirements.includes('garden') && frontGardenDepth > 0) {
    const gardenId = generateId();
    rooms.push({
      id: gardenId,
      name: 'Front Garden',
      type: 'garden',
      x: 0,
      y: L - frontGardenDepth,
      width: W,
      height: frontGardenDepth,
      color: '#84CC16' // Lime Green
    });

    furniture.push({
      id: generateId(),
      name: 'Garden Table',
      type: 'table',
      x: W * 0.25,
      y: L - (frontGardenDepth * 0.6),
      width: 3,
      height: 3,
      rotation: 0,
      roomId: gardenId
    });

    furniture.push({
      id: generateId(),
      name: 'Garden Chair A',
      type: 'chair',
      x: W * 0.25 - 2,
      y: L - (frontGardenDepth * 0.6),
      width: 1.5,
      height: 1.5,
      rotation: 90,
      roomId: gardenId
    });

    furniture.push({
      id: generateId(),
      name: 'Garden Chair B',
      type: 'chair',
      x: W * 0.25 + 3.5,
      y: L - (frontGardenDepth * 0.6),
      width: 1.5,
      height: 1.5,
      rotation: 270,
      roomId: gardenId
    });

    // Add some plants
    furniture.push({
      id: generateId(),
      name: 'Ornamental Tree',
      type: 'plant',
      x: W * 0.75,
      y: L - 3,
      width: 4,
      height: 4,
      rotation: 0,
      roomId: gardenId
    });
  }

  // Cost and Vastu reports
  const costEstimate = calculateCostEstimate(config);
  const vastuReport = evaluateVastuReport(rooms, config);

  // Design Concept image templates (DALL-E fallbacks)
  const variations = getMockVariations(config.style);

  return {
    id: generateId(),
    name: `${config.style} ${config.bedrooms}BHK Dream Home`,
    config,
    rooms,
    furniture,
    materialPalette,
    costEstimate,
    vastuReport,
    variations,
    createdAt: new Date().toISOString()
  };
}

// Helper to retrieve pre-curated design rendering mocks
export function getMockVariations(style: DesignStyle): DesignVariation[] {
  // We'll return 3 gorgeous mock variations per style
  const styleLower = style.toLowerCase();
  
  const mocks: Record<DesignStyle, DesignVariation[]> = {
    Modern: [
      {
        id: 'mod-1',
        name: 'Contemporary Open-Plan Living',
        description: 'Large glass windows, high ceiling, seamless indoor-outdoor transition, steel-framed structure.',
        imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'mod-2',
        name: 'Sleek Cantilevered Exterior',
        description: 'Stunning dusk render showcasing bold geometric shapes, concrete cladding, and smart accent lighting.',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'mod-3',
        name: 'Monolithic Kitchen & Dining',
        description: 'Integrated appliances, matte black finishes, textured wood cabinets, and waterfall kitchen island.',
        imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80'
      }
    ],
    Minimalist: [
      {
        id: 'min-1',
        name: 'Zen Bedroom Sanctuary',
        description: 'Low-profile platform bed, light maple woods, soft linen textures, and warm, diffused recessed lights.',
        imageUrl: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'min-2',
        name: 'Wabi-Sabi Living Space',
        description: 'Textured plaster walls, single oak bench, neutral tones, and simple ceramic details basking in natural sunlight.',
        imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'min-3',
        name: 'Japandi Glass Foyer',
        description: 'Clean sightlines, screen dividers, minimal furniture, and a single statement plant in concrete pot.',
        imageUrl: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=800&q=80'
      }
    ],
    Luxury: [
      {
        id: 'lux-1',
        name: 'Grand Marble Great Room',
        description: 'Double-height ceiling, polished Carrara marble floor, massive crystal chandelier, and gold brass details.',
        imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'lux-2',
        name: 'Infinity Pool & Mansion Facade',
        description: 'Bespoke architectural layout with private deck, luxury sunbeds, limestone columns, and manicured landscaping.',
        imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'lux-3',
        name: 'Royal Master Suite',
        description: 'Velvet-paneled king headboard, private lounge area, panoramic terrace access, and bespoke walk-in wardrobe.',
        imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&w=800&q=80'
      }
    ],
    Traditional: [
      {
        id: 'trad-1',
        name: 'Classic Craftsman Living Room',
        description: 'Rich mahogany wooden paneling, exposed brick fireplace hearth, deep leather sofas, and cozy wool rugs.',
        imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'trad-2',
        name: 'Gabled Countryside Estate',
        description: 'Warm fieldstone siding, multiple sloped shingle roof gables, dormer windows, and a welcoming front porch.',
        imageUrl: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'trad-3',
        name: 'Farmhouse Hearth Kitchen',
        description: 'Shaker cabinets, classic copper range hood, heavy oak farmhouse dining table, and vintage tile backsplash.',
        imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
      }
    ]
  };

  return mocks[style] || mocks.Modern;
}
