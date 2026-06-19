"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useScroll as useMotionScroll } from "framer-motion";
import * as THREE from "three";

// Pre-computed mathematical constants outside the rendering loop to avoid CPU overhead during frames
const ROT_X_FACTOR = Math.PI * 1.5;
const ROT_Y_FACTOR = Math.PI * 2.0;
const POS_Y_START = 1.2;
const POS_Y_FACTOR = 3.5;

// Custom R3F component rendering the wireframe brutalist microchip / neural network mesh
function SceneNode({ color = "#ffffff" }: { color?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Independent layer refs to achieve complex counter-rotations and system dynamics
  const coreRef = useRef<THREE.Mesh>(null);
  const planesRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.Group>(null);
  
  const lastProgressRef = useRef<number>(-1);
  const { scrollYProgress } = useMotionScroll();

  useFrame((state) => {
    if (groupRef.current) {
      const progress = scrollYProgress.get();

      // Skip updates if scroll position hasn't changed to save CPU cycles
      if (progress === lastProgressRef.current) return;
      lastProgressRef.current = progress;

      // 1. Animate Camera Position & LookAt (The Hardware Dive)
      // Zooms in, sweeps side-to-side on a sine wave, and pans down
      state.camera.position.z = 5.5 - progress * 3.7;
      state.camera.position.x = Math.sin(progress * Math.PI) * 1.8;
      state.camera.position.y = 1.0 - progress * 2.5;
      state.camera.lookAt(0, 0, 0);

      // 2. Rotate the parent group to match
      groupRef.current.rotation.y = progress * Math.PI * 1.5;
      groupRef.current.rotation.x = progress * Math.PI * 0.5;

      // Kinetic layers: spin sub-systems at different velocities to create mechanical complexity
      if (coreRef.current) {
        coreRef.current.rotation.y = -progress * Math.PI * 1.0;
      }
      if (planesRef.current) {
        planesRef.current.rotation.z = progress * Math.PI * 0.8;
      }
      if (nodesRef.current) {
        nodesRef.current.rotation.y = progress * Math.PI * 2.0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central Core: Tall, rectangular monolith acting as the main CPU node */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <boxGeometry args={[1.0, 3.0, 1.0]} />
        <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.2} />
      </mesh>

      {/* Intersecting Execution Planes / CPU Circuit Layers */}
      <group ref={planesRef}>
        {/* Horizontal Bus Plane 1 */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[3.0, 0.05, 3.0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.15} />
        </mesh>
        
        {/* Horizontal Bus Plane 2 */}
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[3.0, 0.05, 3.0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.15} />
        </mesh>

        {/* Diagonal Crossing Intersects */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[3.2, 0.05, 1.2]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.1} />
        </mesh>
        
        <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[1.2, 0.05, 3.2]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.1} />
        </mesh>
      </group>

      {/* Orbiting Shattered Data Nodes */}
      <group ref={nodesRef}>
        {/* Node 1: Box Node */}
        <mesh position={[-1.8, 1.2, -1.2]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.2} />
        </mesh>

        {/* Node 2: Octahedron Node */}
        <mesh position={[1.8, -1.2, 1.2]}>
          <octahedronGeometry args={[0.35, 0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.2} />
        </mesh>

        {/* Node 3: Low-Poly Icosahedron Node */}
        <mesh position={[-1.5, -1.0, 1.5]}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.2} />
        </mesh>

        {/* Node 4: Box Node */}
        <mesh position={[1.5, 1.0, -1.5]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.2} />
        </mesh>

        {/* Node 5: Octahedron Node */}
        <mesh position={[-0.3, 2.0, 1.8]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.15} />
        </mesh>

        {/* Node 6: Low-Poly Icosahedron Node */}
        <mesh position={[0.3, -2.2, -1.8]}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.15} />
        </mesh>

        {/* Node 7: Box Node */}
        <mesh position={[-2.2, 0.0, 0.5]}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.15} />
        </mesh>

        {/* Node 8: Octahedron Node */}
        <mesh position={[2.2, 0.2, -0.6]}>
          <octahedronGeometry args={[0.28, 0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent={true} opacity={0.15} />
        </mesh>
      </group>

      {/* Outer bounding structural cages - Lattice boundary lines */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(4.0, 4.0, 4.0)]} />
        <lineBasicMaterial color={color} transparent={true} opacity={0.05} />
      </lineSegments>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2.0, 2.0, 2.0)]} />
        <lineBasicMaterial color={color} transparent={true} opacity={0.08} />
      </lineSegments>
    </group>
  );
}

export default function WebGLBackground({ color = "#ffffff" }: { color?: string }) {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 bg-transparent">
      <Canvas 
        camera={{ position: [0, 0, 5.5], fov: 55 }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true, stencil: false, depth: false }}
        dpr={[1, 1]} // Force 1:1 resolution to avoid supersampling overhead and achieve jagged brutalist look
      >
        <SceneNode color={color} />
      </Canvas>
    </div>
  );
}
