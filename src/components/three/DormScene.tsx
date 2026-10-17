"use client";

/** Floating dorm essentials built from primitives — "useful things waiting to be claimed". */
import { ContactShadows, Float, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { SceneQuality } from "./Scene3D";

const INK = "#1a1512";
const CREAM = "#f3ede2";

function Fridge({ color }: { color: string }) {
  return (
    <group>
      <RoundedBox args={[1, 1.5, 0.95]} radius={0.12} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0.28, 0.48]}>
        <boxGeometry args={[0.98, 0.02, 0.02]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0.36, 0.55, 0.5]}>
        <boxGeometry args={[0.06, 0.26, 0.06]} />
        <meshStandardMaterial color={CREAM} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0.36, -0.1, 0.5]}>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshStandardMaterial color={CREAM} metalness={0.6} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Lamp({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <coneGeometry args={[0.5, 0.6, 32, 1, true]} />
        <meshStandardMaterial color={color} side={2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#fff3c4" emissive="#ffd27a" emissiveIntensity={2.2} />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.3, 12]} />
        <meshStandardMaterial color={INK} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.92, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 0.08, 32]} />
        <meshStandardMaterial color={INK} />
      </mesh>
    </group>
  );
}

function MovingBox() {
  return (
    <group rotation={[0.2, 0.5, 0]}>
      <RoundedBox args={[1.2, 0.85, 0.9]} radius={0.04}>
        <meshStandardMaterial color="#c99a62" roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.92]} />
        <meshStandardMaterial color="#e8d3a8" roughness={0.4} />
      </mesh>
      {/* the DIBS sticker */}
      <mesh position={[0.15, 0.05, 0.455]} rotation={[0, 0, -0.18]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Plant() {
  return (
    <group>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.32, 0.24, 0.5, 24]} />
        <meshStandardMaterial color="#d86a4a" roughness={0.8} />
      </mesh>
      {[
        [0, 0.15, 0, 0.32],
        [0.22, 0.32, 0.05, 0.24],
        [-0.2, 0.3, -0.05, 0.26],
        [0.02, 0.5, 0.08, 0.2],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={i % 2 ? "#3f8f5a" : "#56a96f"} roughness={0.7} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Chair({ color }: { color: string }) {
  return (
    <group rotation={[0.1, -0.6, 0]}>
      <RoundedBox args={[0.9, 0.14, 0.85]} radius={0.06} position={[0, 0, 0]}>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.85, 0.12]} radius={0.06} position={[0, 0.48, -0.38]}>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      {[
        [-0.38, -0.38],
        [0.38, -0.38],
        [-0.38, 0.36],
        [0.38, 0.36],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.42, z]}>
          <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
          <meshStandardMaterial color={INK} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Mug({ color }: { color: string }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.24, 0.22, 0.48, 24]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.12, 0.04, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Rig({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const g = useRef<Group>(null);
  useFrame((state, dt) => {
    if (!g.current || reduced) return;
    const { x, y } = state.pointer;
    g.current.rotation.y += (x * 0.25 - g.current.rotation.y) * Math.min(1, dt * 2.5);
    g.current.rotation.x += (-y * 0.12 - g.current.rotation.x) * Math.min(1, dt * 2.5);
  });
  return <group ref={g}>{children}</group>;
}

export function DormScene({ quality, accent }: { quality: SceneQuality; accent: string }) {
  const reduced = quality.reducedMotion;
  const float = (speed: number) => (reduced ? { speed: 0, rotationIntensity: 0, floatIntensity: 0 } : { speed, rotationIntensity: 0.6, floatIntensity: 1.1 });
  const items: { node: React.ReactNode; pos: [number, number, number]; s: number; speed: number; hideMobile?: boolean }[] = [
    { node: <Fridge color={accent} />, pos: [1.7, 0.2, 0], s: 1, speed: 1.4 },
    { node: <Lamp color={CREAM} />, pos: [-1.9, 0.8, -0.6], s: 0.9, speed: 1.8 },
    { node: <MovingBox />, pos: [-0.4, -1.3, 0.6], s: 0.9, speed: 1.2 },
    { node: <Plant />, pos: [3.2, -1.1, -1], s: 0.9, speed: 2, hideMobile: true },
    { node: <Chair color="#5fa8d3" />, pos: [-3.3, -0.9, -1.2], s: 0.85, speed: 1.6, hideMobile: true },
    { node: <Mug color="#ffd23f" />, pos: [0.1, 1.6, -1.4], s: 0.9, speed: 2.4 },
  ];
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#fff1e0" />
      <directionalLight position={[-6, -2, -4]} intensity={0.8} color={accent} />
      <pointLight position={[-1.9, 1.2, 0.4]} intensity={6} distance={4} color="#ffd27a" />
      <Rig reduced={reduced}>
        {items
          .filter((i) => !(quality.mobile && i.hideMobile))
          .map((i, idx) => (
            <Float key={idx} {...float(i.speed)} position={i.pos}>
              <group scale={i.s}>{i.node}</group>
            </Float>
          ))}
      </Rig>
      {!quality.mobile ? <ContactShadows position={[0, -2.4, 0]} opacity={0.45} scale={12} blur={2.8} far={4} resolution={256} frames={reduced ? 1 : Infinity} /> : null}
    </>
  );
}
