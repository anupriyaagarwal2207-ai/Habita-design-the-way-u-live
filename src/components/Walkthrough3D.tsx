'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HousePlan, Room, Furniture, RoomType, FurnitureType } from '../types/designer';
import { Eye, Compass, Move, Info, RefreshCw } from 'lucide-react';

interface Walkthrough3DProps {
  plan: HousePlan;
}

export default function Walkthrough3D({ plan }: Walkthrough3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'orbit' | 'fp'>('orbit'); // 'orbit' = Dollhouse, 'fp' = First-Person Walkthrough
  const [controlsInfo, setControlsInfo] = useState('Use mouse to drag and rotate. Scroll to zoom.');

  // Store references for the animation loop controls
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const fpDirection = useRef(new THREE.Vector3());
  const fpVelocity = useRef(new THREE.Vector3());
  const mouseMoveRef = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19');
    scene.fog = new THREE.FogExp2('#0b0f19', 0.015);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

    // Position camera for Dollhouse view by default
    const plotW = plan.config.plotWidth;
    const plotL = plan.config.plotLength;
    camera.position.set(plotW / 2, Math.max(plotW, plotL) * 1.2, plotL * 1.2);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls (for Dollhouse view)
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    orbitControls.minDistance = 5;
    orbitControls.maxDistance = Math.max(plotW, plotL) * 3;
    orbitControls.target.set(plotW / 2, 0, plotL / 2);
    orbitControls.update();

    // 5. Lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fff9e6', 1.2);
    sunLight.position.set(plotW * 0.7, 40, plotL * 0.3);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;

    const d = Math.max(plotW, plotL) * 0.8;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Subtle blueish ground ambient light
    const hemisphereLight = new THREE.HemisphereLight('#cbd5e1', '#0f172a', 0.4);
    scene.add(hemisphereLight);

    // 6. Build the House geometry
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);

    // 6.1 Ground Plot
    const groundGeo = new THREE.PlaneGeometry(plotW, plotL);
    groundGeo.rotateX(-Math.PI / 2);
    // Move geometry origin to match our 2D coordinate system where bottom-left is (0,0)
    groundGeo.translate(plotW / 2, 0, plotL / 2);

    // Choose floor material colors based on plan
    const floorColor = plan.materialPalette.floorColor || '#475569';
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(floorColor),
      roughness: 0.2,
      metalness: 0.1
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    houseGroup.add(ground);

    // Plot outer border line
    const borderGeo = new THREE.BoxGeometry(plotW + 0.5, 0.1, plotL + 0.5);
    const borderMat = new THREE.MeshBasicMaterial({ color: '#4f46e5', wireframe: true });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.position.set(plotW / 2, -0.05, plotL / 2);
    houseGroup.add(borderMesh);

    // 6.2 Render Rooms (Floors & Walls)
    const wallHeight = 9.0;
    const wallThickness = 0.4;
    const wallColor = plan.materialPalette.wallColor || '#f3f4f6';

    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(wallColor),
      roughness: 0.8,
      metalness: 0.1
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5
    });

    plan.rooms.forEach(room => {
      // Room floor (colored slightly different for visualization if needed, or matched to general palette)
      const roomFloorGeo = new THREE.PlaneGeometry(room.width - 0.05, room.height - 0.05);
      roomFloorGeo.rotateX(-Math.PI / 2);
      roomFloorGeo.translate(room.x + room.width / 2, 0.01, room.y + room.height / 2);

      const roomFloorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.color).multiplyScalar(0.7), // darken color for floor tint
        roughness: 0.4,
      });
      const roomFloor = new THREE.Mesh(roomFloorGeo, roomFloorMat);
      roomFloor.receiveShadow = true;
      houseGroup.add(roomFloor);

      // Render 4 walls for this room
      // To create doors and windows, we will render partition walls with gaps
      const renderWall = (x: number, z: number, w: number, d: number, name: string) => {
        // Simple door cutout: If this is an interior wall, we can render it in two sections, leaving a gap,
        // or just draw a shorter partition. For realism, let's leave an opening!
        // We'll generate walls as boxes.
        const wallGeo = new THREE.BoxGeometry(w, wallHeight, d);
        const wallMesh = new THREE.Mesh(wallGeo, wallMat);
        wallMesh.position.set(x, wallHeight / 2, z);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        houseGroup.add(wallMesh);
      };

      // Coordinates: X = horizontal, Z = vertical (mapped from Y in 2D)
      const rx = room.x;
      const rz = room.y; // 2D y is 3D z
      const rw = room.width;
      const rh = room.height;

      // Bottom Wall (Z = rz) - leave center 3ft open for a door if it is not outer plot wall
      const isBottomOuter = rz === 0;
      if (isBottomOuter) {
        renderWall(rx + rw / 2, rz, rw, wallThickness, 'bottom-outer');
      } else {
        // Door opening: left section + right section
        const doorWidth = 3.2;
        const leftSectionW = (rw - doorWidth) / 2;
        renderWall(rx + leftSectionW / 2, rz, leftSectionW, wallThickness, 'bottom-inner-left');
        renderWall(rx + rw - leftSectionW / 2, rz, leftSectionW, wallThickness, 'bottom-inner-right');

        // Add lintel beam over the door (top part of wall)
        const lintelGeo = new THREE.BoxGeometry(doorWidth, wallHeight - 7.0, wallThickness);
        const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
        lintelMesh.position.set(rx + leftSectionW + doorWidth / 2, 7.0 + (wallHeight - 7.0) / 2, rz);
        houseGroup.add(lintelMesh);
      }

      // Top Wall (Z = rz + rh)
      const isTopOuter = Math.abs(rz + rh - plotL) < 0.1;
      if (isTopOuter) {
        renderWall(rx + rw / 2, rz + rh, rw, wallThickness, 'top-outer');
      } else {
        const doorWidth = 3.2;
        const leftSectionW = (rw - doorWidth) / 2;
        renderWall(rx + leftSectionW / 2, rz + rh, leftSectionW, wallThickness, 'top-inner-left');
        renderWall(rx + rw - leftSectionW / 2, rz + rh, leftSectionW, wallThickness, 'top-inner-right');

        const lintelGeo = new THREE.BoxGeometry(doorWidth, wallHeight - 7.0, wallThickness);
        const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
        lintelMesh.position.set(rx + leftSectionW + doorWidth / 2, 7.0 + (wallHeight - 7.0) / 2, rz + rh);
        houseGroup.add(lintelMesh);
      }

      // Left Wall (X = rx)
      const isLeftOuter = rx === 0;
      if (isLeftOuter) {
        renderWall(rx, rz + rh / 2, wallThickness, rh, 'left-outer');
      } else {
        const doorWidth = 3.2;
        const bottomSectionH = (rh - doorWidth) / 2;
        renderWall(rx, rz + bottomSectionH / 2, wallThickness, bottomSectionH, 'left-inner-bottom');
        renderWall(rx, rz + rh - bottomSectionH / 2, wallThickness, bottomSectionH, 'left-inner-top');

        const lintelGeo = new THREE.BoxGeometry(wallThickness, wallHeight - 7.0, doorWidth);
        const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
        lintelMesh.position.set(rx, 7.0 + (wallHeight - 7.0) / 2, rz + bottomSectionH + doorWidth / 2);
        houseGroup.add(lintelMesh);
      }

      // Right Wall (X = rx + rw)
      const isRightOuter = Math.abs(rx + rw - plotW) < 0.1;
      if (isRightOuter) {
        renderWall(rx + rw, rz + rh / 2, wallThickness, rh, 'right-outer');
      } else {
        const doorWidth = 3.2;
        const bottomSectionH = (rh - doorWidth) / 2;
        renderWall(rx + rw, rz + bottomSectionH / 2, wallThickness, bottomSectionH, 'right-inner-bottom');
        renderWall(rx + rw, rz + rh - bottomSectionH / 2, wallThickness, bottomSectionH, 'right-inner-top');

        const lintelGeo = new THREE.BoxGeometry(wallThickness, wallHeight - 7.0, doorWidth);
        const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
        lintelMesh.position.set(rx + rw, 7.0 + (wallHeight - 7.0) / 2, rz + bottomSectionH + doorWidth / 2);
        houseGroup.add(lintelMesh);
      }

      // Special handling for Swimming Pool: Make it a blue plane at Y = -0.5 with water reflection look
      if (room.type === 'pool') {
        const poolWaterGeo = new THREE.PlaneGeometry(room.width - 0.2, room.height - 0.2);
        poolWaterGeo.rotateX(-Math.PI / 2);
        poolWaterGeo.translate(room.x + room.width / 2, 0.05, room.y + room.height / 2);

        const poolWaterMat = new THREE.MeshStandardMaterial({
          color: '#06b6d4',
          transparent: true,
          opacity: 0.8,
          roughness: 0.1,
          metalness: 0.8
        });
        const water = new THREE.Mesh(poolWaterGeo, poolWaterMat);
        houseGroup.add(water);
      }
    });

    // 6.3 Render Furniture
    // We will build detailed composite shapes for each furniture type
    const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.6 });
    const mattressMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.8 });
    const fabricMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.3, metalness: 0.8 });
    const blackPlasticMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.9 });

    plan.furniture.forEach(item => {
      const fGroup = new THREE.Group();
      // Center of furniture in 3D
      // item.x, item.y in 2D is the bottom-left of the furniture bounding box.
      // We want to translate coordinates to center.
      const fX = item.x + item.width / 2;
      const fZ = item.y + item.height / 2; // 2D y is 3D z

      fGroup.position.set(fX, 0, fZ);

      // Apply rotation (in degrees) converted to radians
      fGroup.rotation.y = - (item.rotation * Math.PI) / 180;

      const w = item.width;
      const h = item.height; // in feet

      switch (item.type) {
        case 'bed': {
          // Bed Frame
          const frameGeo = new THREE.BoxGeometry(w, 0.8, h);
          const frameMesh = new THREE.Mesh(frameGeo, woodMat);
          frameMesh.position.y = 0.4;
          frameMesh.castShadow = true;
          frameMesh.receiveShadow = true;
          fGroup.add(frameMesh);

          // Headboard
          const headGeo = new THREE.BoxGeometry(w, 3, 0.4);
          const headMesh = new THREE.Mesh(headGeo, woodMat);
          headMesh.position.set(0, 1.5, -h / 2 + 0.2);
          headMesh.castShadow = true;
          fGroup.add(headMesh);

          // Mattress
          const matGeo = new THREE.BoxGeometry(w - 0.2, 0.8, h - 0.4);
          const matMesh = new THREE.Mesh(matGeo, mattressMat);
          matMesh.position.set(0, 1.0, 0.1);
          matMesh.castShadow = true;
          fGroup.add(matMesh);

          // Pillows (2 pillows)
          const pillowW = (w - 1.0) / 2;
          const pillowGeo = new THREE.BoxGeometry(pillowW, 0.2, 1.2);

          const pillow1 = new THREE.Mesh(pillowGeo, pillowMat);
          pillow1.position.set(-w / 4, 1.45, -h / 2 + 1.2);
          fGroup.add(pillow1);

          const pillow2 = new THREE.Mesh(pillowGeo, pillowMat);
          pillow2.position.set(w / 4, 1.45, -h / 2 + 1.2);
          fGroup.add(pillow2);
          break;
        }

        case 'sofa': {
          // Sofa Base
          const baseGeo = new THREE.BoxGeometry(w, 0.5, h);
          const baseMesh = new THREE.Mesh(baseGeo, fabricMat);
          baseMesh.position.y = 0.25;
          baseMesh.castShadow = true;
          fGroup.add(baseMesh);

          // Backrest
          const backGeo = new THREE.BoxGeometry(w, 2.2, 0.5);
          const backMesh = new THREE.Mesh(backGeo, fabricMat);
          backMesh.position.set(0, 1.1, -h / 2 + 0.25);
          backMesh.castShadow = true;
          fGroup.add(backMesh);

          // Armrests
          const armGeo = new THREE.BoxGeometry(0.5, 1.5, h);

          const armLeft = new THREE.Mesh(armGeo, fabricMat);
          armLeft.position.set(-w / 2 + 0.25, 0.75, 0);
          armLeft.castShadow = true;
          fGroup.add(armLeft);

          const armRight = new THREE.Mesh(armGeo, fabricMat);
          armRight.position.set(w / 2 - 0.25, 0.75, 0);
          armRight.castShadow = true;
          fGroup.add(armRight);

          // Cushions
          const seatGeo = new THREE.BoxGeometry(w - 1.0, 0.4, h - 0.5);
          const seatMesh = new THREE.Mesh(seatGeo, mattressMat); // soft white cushion contrast
          seatMesh.position.set(0, 0.7, 0.25);
          seatMesh.castShadow = true;
          fGroup.add(seatMesh);
          break;
        }

        case 'table': {
          // Table Top
          const topGeo = new THREE.BoxGeometry(w, 0.15, h);
          const topMesh = new THREE.Mesh(topGeo, woodMat);
          topMesh.position.y = 2.5;
          topMesh.castShadow = true;
          topMesh.receiveShadow = true;
          fGroup.add(topMesh);

          // 4 Legs
          const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5);
          const legLocations = [
            [-w / 2 + 0.2, -h / 2 + 0.2],
            [w / 2 - 0.2, -h / 2 + 0.2],
            [-w / 2 + 0.2, h / 2 - 0.2],
            [w / 2 - 0.2, h / 2 - 0.2]
          ];
          legLocations.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(lx, 1.25, lz);
            leg.castShadow = true;
            fGroup.add(leg);
          });
          break;
        }

        case 'chair': {
          const seatGeo = new THREE.BoxGeometry(w, 0.1, h);
          const seatMesh = new THREE.Mesh(seatGeo, woodMat);
          seatMesh.position.y = 1.5;
          fGroup.add(seatMesh);

          const backGeo = new THREE.BoxGeometry(w, 1.5, 0.1);
          const backMesh = new THREE.Mesh(backGeo, woodMat);
          backMesh.position.set(0, 2.25, -h / 2 + 0.05);
          fGroup.add(backMesh);

          const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5);
          const legPos = [
            [-w / 2 + 0.1, -h / 2 + 0.1],
            [w / 2 - 0.1, -h / 2 + 0.1],
            [-w / 2 + 0.1, h / 2 - 0.1],
            [w / 2 - 0.1, h / 2 - 0.1]
          ];
          legPos.forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(lx, 0.75, lz);
            fGroup.add(leg);
          });
          break;
        }

        case 'tv': {
          // Console table
          const consoleGeo = new THREE.BoxGeometry(w, 1.4, h);
          const consoleMesh = new THREE.Mesh(consoleGeo, woodMat);
          consoleMesh.position.y = 0.7;
          consoleMesh.castShadow = true;
          fGroup.add(consoleMesh);

          // TV Screen
          const tvGeo = new THREE.BoxGeometry(w * 0.8, 2.2, 0.15);
          const tvMesh = new THREE.Mesh(tvGeo, blackPlasticMat);
          tvMesh.position.set(0, 2.8, 0);
          tvMesh.castShadow = true;
          fGroup.add(tvMesh);

          // TV Stand
          const standGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5);
          const standMesh = new THREE.Mesh(standGeo, metalMat);
          standMesh.position.set(0, 1.65, 0);
          fGroup.add(standMesh);

          const baseStand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), metalMat);
          baseStand.position.set(0, 1.425, 0);
          fGroup.add(baseStand);
          break;
        }

        case 'desk': {
          // Desk top
          const topGeo = new THREE.BoxGeometry(w, 0.12, h);
          const topMesh = new THREE.Mesh(topGeo, woodMat);
          topMesh.position.y = 2.4;
          topMesh.castShadow = true;
          fGroup.add(topMesh);

          // Side support panels
          const supportGeo = new THREE.BoxGeometry(0.12, 2.4, h);

          const supportL = new THREE.Mesh(supportGeo, woodMat);
          supportL.position.set(-w / 2 + 0.06, 1.2, 0);
          supportL.castShadow = true;
          fGroup.add(supportL);

          const supportR = new THREE.Mesh(supportGeo, woodMat);
          supportR.position.set(w / 2 - 0.06, 1.2, 0);
          supportR.castShadow = true;
          fGroup.add(supportR);

          // Laptop block
          const laptopGeo = new THREE.BoxGeometry(1.3, 0.05, 1.0);
          const laptop = new THREE.Mesh(laptopGeo, metalMat);
          laptop.position.set(0, 2.5, 0);
          fGroup.add(laptop);

          const screenGeo = new THREE.BoxGeometry(1.3, 0.85, 0.04);
          const screen = new THREE.Mesh(screenGeo, blackPlasticMat);
          screen.position.set(0, 2.9, -0.45);
          screen.rotation.x = 0.15;
          fGroup.add(screen);
          break;
        }

        case 'toilet': {
          const porcelainMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.1 });

          // Bowl
          const bowlGeo = new THREE.BoxGeometry(w * 0.8, 1.3, h * 0.6);
          const bowl = new THREE.Mesh(bowlGeo, porcelainMat);
          bowl.position.set(0, 0.65, h * 0.15);
          bowl.castShadow = true;
          fGroup.add(bowl);

          // Tank
          const tankGeo = new THREE.BoxGeometry(w, 1.4, h * 0.35);
          const tank = new THREE.Mesh(tankGeo, porcelainMat);
          tank.position.set(0, 1.95, -h * 0.3);
          tank.castShadow = true;
          fGroup.add(tank);
          break;
        }

        case 'shower': {
          // Shower Tray
          const trayGeo = new THREE.BoxGeometry(w, 0.15, h);
          const tray = new THREE.Mesh(trayGeo, metalMat);
          tray.position.y = 0.075;
          fGroup.add(tray);

          // Glass walls (2 walls, since cornered usually)
          const glassGeo = new THREE.BoxGeometry(w, wallHeight * 0.8, 0.08);

          const glassBack = new THREE.Mesh(glassGeo, glassMat);
          glassBack.position.set(0, (wallHeight * 0.8) / 2, -h / 2 + 0.04);
          fGroup.add(glassBack);

          const glassSideGeo = new THREE.BoxGeometry(0.08, wallHeight * 0.8, h);
          const glassSide = new THREE.Mesh(glassSideGeo, glassMat);
          glassSide.position.set(-w / 2 + 0.04, (wallHeight * 0.8) / 2, 0);
          fGroup.add(glassSide);
          break;
        }

        case 'sink': {
          // Vanity counter
          const counterGeo = new THREE.BoxGeometry(w, 2.5, h);
          const counter = new THREE.Mesh(counterGeo, woodMat);
          counter.position.y = 1.25;
          counter.castShadow = true;
          fGroup.add(counter);

          // White sink basin insert
          const basinGeo = new THREE.BoxGeometry(w * 0.7, 0.1, h * 0.7);
          const basin = new THREE.Mesh(basinGeo, mattressMat);
          basin.position.set(0, 2.55, 0);
          fGroup.add(basin);

          // Faucet
          const faucetGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5);
          const faucet = new THREE.Mesh(faucetGeo, metalMat);
          faucet.position.set(0, 2.8, -h * 0.35);
          fGroup.add(faucet);
          break;
        }

        case 'fridge': {
          const fridgeGeo = new THREE.BoxGeometry(w, 6.2, h);
          const fridge = new THREE.Mesh(fridgeGeo, metalMat);
          fridge.position.y = 3.1;
          fridge.castShadow = true;
          fGroup.add(fridge);

          // Handle lines
          const handleGeo = new THREE.BoxGeometry(0.05, 1.8, 0.1);
          const handle = new THREE.Mesh(handleGeo, blackPlasticMat);
          handle.position.set(w / 2 - 0.1, 4.0, h / 2 + 0.05);
          fGroup.add(handle);
          break;
        }

        case 'stove': {
          // Cabinet base
          const baseGeo = new THREE.BoxGeometry(w, 2.7, h);
          const base = new THREE.Mesh(baseGeo, woodMat);
          base.position.y = 1.35;
          base.castShadow = true;
          fGroup.add(base);

          // Cooktop
          const topGeo = new THREE.BoxGeometry(w - 0.2, 0.05, h - 0.2);
          const topMesh = new THREE.Mesh(topGeo, blackPlasticMat);
          topMesh.position.set(0, 2.725, 0);
          fGroup.add(topMesh);

          // Burners
          const burnerGeo = new THREE.CylinderGeometry(w * 0.15, w * 0.15, 0.02);
          const b1 = new THREE.Mesh(burnerGeo, metalMat);
          b1.position.set(-w * 0.2, 2.75, 0);
          fGroup.add(b1);

          const b2 = new THREE.Mesh(burnerGeo, metalMat);
          b2.position.set(w * 0.2, 2.75, 0);
          fGroup.add(b2);
          break;
        }

        case 'plant': {
          // Pot
          const potGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.2, 1.2);
          const pot = new THREE.Mesh(potGeo, blackPlasticMat);
          pot.position.y = 0.6;
          pot.castShadow = true;
          fGroup.add(pot);

          // Plant stem & foliage
          const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
          const stem = new THREE.Mesh(stemGeo, woodMat);
          stem.position.y = 1.35;
          fGroup.add(stem);

          const sphereGeo = new THREE.SphereGeometry(w * 0.48, 8, 8);
          const foliage = new THREE.Mesh(sphereGeo, foliageMat);
          foliage.position.y = 2.4;
          foliage.castShadow = true;
          fGroup.add(foliage);
          break;
        }

        case 'car': {
          const carBodyMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.1, metalness: 0.8 });

          // Lower Body
          const lowerGeo = new THREE.BoxGeometry(w, 1.8, h);
          const lower = new THREE.Mesh(lowerGeo, carBodyMat);
          lower.position.y = 1.1;
          lower.castShadow = true;
          fGroup.add(lower);

          // Cabin
          const cabinGeo = new THREE.BoxGeometry(w * 0.9, 1.5, h * 0.55);
          const cabin = new THREE.Mesh(cabinGeo, carBodyMat);
          cabin.position.set(0, 2.2, -h * 0.05);
          cabin.castShadow = true;
          fGroup.add(cabin);

          // Windows
          const winGeo = new THREE.BoxGeometry(w * 0.85, 0.8, h * 0.5);
          const win = new THREE.Mesh(winGeo, blackPlasticMat);
          win.position.set(0, 2.3, -h * 0.05);
          fGroup.add(win);

          // Wheels (4)
          const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.35);
          wheelGeo.rotateZ(Math.PI / 2);
          const wheelsPos = [
            [-w / 2 - 0.1, 0.6, -h * 0.25],
            [w / 2 + 0.1, 0.6, -h * 0.25],
            [-w / 2 - 0.1, 0.6, h * 0.25],
            [w / 2 + 0.1, 0.6, h * 0.25]
          ];
          wheelsPos.forEach(([wx, wy, wz]) => {
            const wheel = new THREE.Mesh(wheelGeo, blackPlasticMat);
            wheel.position.set(wx, wy, wz);
            fGroup.add(wheel);
          });
          break;
        }

        case 'pool_chair': {
          // Sloped deck chair
          const baseBox = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, h), woodMat);
          baseBox.position.y = 0.25;
          fGroup.add(baseBox);

          const backSlope = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.15, h * 0.5), woodMat);
          backSlope.position.set(0, 0.8, -h * 0.25);
          backSlope.rotation.x = -0.6; // tilt up
          fGroup.add(backSlope);
          break;
        }
      }

      houseGroup.add(fGroup);
    });

    // 7. Window Resizing handling
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Movement loop for First-Person Walkthrough
    let lastTime = performance.now();

    const animate = (time: number) => {
      requestAnimationFrame(animate);

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (viewMode === 'fp') {
        // Apply WASD key inputs for first-person locomotion
        const speed = 15.0; // Feet per second
        fpVelocity.current.x = 0;
        fpVelocity.current.z = 0;

        if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
          fpVelocity.current.z = -speed;
        }
        if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
          fpVelocity.current.z = speed;
        }
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          fpVelocity.current.x = -speed;
        }
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          fpVelocity.current.x = speed;
        }

        // Rotate movement direction based on camera horizontal angle (yaw)
        const yaw = cameraRotation.current.yaw;
        const moveX = fpVelocity.current.x * Math.cos(yaw) + fpVelocity.current.z * Math.sin(yaw);
        const moveZ = fpVelocity.current.z * Math.cos(yaw) - fpVelocity.current.x * Math.sin(yaw);

        // Update camera position
        camera.position.x += moveX * delta;
        camera.position.z += moveZ * delta;

        // Boundaries constraint: Keep user inside the plot with simple padding
        camera.position.x = Math.max(1, Math.min(plotW - 1, camera.position.x));
        camera.position.z = Math.max(1, Math.min(plotL - 1, camera.position.z));
        camera.position.y = 5.2; // Constant eye level height (5.2 feet)

        // Apply mouse looking angle
        const pitch = cameraRotation.current.pitch;

        const target = new THREE.Vector3();
        target.x = camera.position.x + Math.sin(yaw) * Math.cos(pitch);
        target.y = camera.position.y + Math.sin(pitch);
        target.z = camera.position.z + Math.cos(yaw) * Math.cos(pitch);
        camera.lookAt(target);

      } else {
        // Dollhouse Orbit view
        orbitControls.update();
      }

      renderer.render(scene, camera);
    };

    const animId = requestAnimationFrame(animate);

    // Event listeners for keyboard locomotion
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    // First person mouse pointer look around
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleCanvasMouseDown = (e: MouseEvent) => {
      if (viewMode !== 'fp') return;
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleCanvasMouseMove = (e: MouseEvent) => {
      if (viewMode !== 'fp' || !isMouseDown) return;
      const movementX = e.clientX - prevMouseX;
      const movementY = e.clientY - prevMouseY;

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      const sensitivity = 0.003;
      cameraRotation.current.yaw -= movementX * sensitivity;
      cameraRotation.current.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraRotation.current.pitch - movementY * sensitivity));
    };

    const handleCanvasMouseUp = () => {
      isMouseDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('mousedown', handleCanvasMouseDown);
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);

    // Clean up
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousedown', handleCanvasMouseDown);
      }
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
      orbitControls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [plan, viewMode]);

  // Adjust camera to first person positioning on toggle
  const toggleViewMode = () => {
    if (viewMode === 'orbit') {
      setViewMode('fp');
      setControlsInfo('Drag on screen to LOOK. Use WASD / ARROWS on your keyboard to WALK.');
      // Initialize rotation to point towards center of plot
      cameraRotation.current = { yaw: Math.PI, pitch: 0 };
    } else {
      setViewMode('orbit');
      setControlsInfo('Use mouse click & drag to ROTATE view. Scroll to ZOOM. Right click + drag to PAN.');
    }
  };

  return (
    <div className="relative h-full w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col">
      {/* 3D Canvas Mount point */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10 select-none">
        <button
          onClick={toggleViewMode}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 shadow-lg ${viewMode === 'fp'
              ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-black dark:text-white'
              : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-700/80 text-indigo-300'
            }`}
        >
          {viewMode === 'fp' ? <Move className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {viewMode === 'fp' ? 'Dollhouse View (3D)' : 'First-Person Walk'}
        </button>
      </div>

      {/* Bottom HUD: instructions & info */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-slate-900/95 border border-slate-800/90 p-3 rounded-xl shadow-xl backdrop-blur max-w-lg mx-auto pointer-events-none z-10">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {controlsInfo}
          </p>
        </div>
      </div>

      {/* 3D Compass indicator */}
      <div className="absolute top-4 left-4 flex flex-col items-center gap-1 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 select-none pointer-events-none">
        <Compass className="w-4 h-4 text-slate-500 animate-pulse" />
        <span className="font-semibold tracking-wider">3D WALKTHROUGH</span>
      </div>
    </div>
  );
}
