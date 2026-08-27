"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Environment, ContactShadows } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";

function LoyaltyCard() {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.35;
    ref.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.12;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.08;
  });

  return (
    <Float speed={1.6} rotationIntensity={0.2} floatIntensity={0.45}>
      <group ref={ref} position={[0, 0.15, 0]}>
        <RoundedBox args={[2.35, 1.45, 0.07]} radius={0.09} smoothness={4}>
          <meshStandardMaterial
            color="#0e1a14"
            metalness={0.55}
            roughness={0.28}
            envMapIntensity={1.2}
          />
        </RoundedBox>
        <mesh position={[-0.75, 0.38, 0.045]}>
          <circleGeometry args={[0.17, 48]} />
          <meshStandardMaterial
            color="#d4b483"
            metalness={0.85}
            roughness={0.18}
            emissive="#d4b483"
            emissiveIntensity={0.15}
          />
        </mesh>
        <mesh position={[-0.32, -0.28, 0.045]}>
          <boxGeometry args={[1.2, 0.07, 0.01]} />
          <meshStandardMaterial color="#eef2ef" roughness={0.4} metalness={0.1} />
        </mesh>
        <mesh position={[-0.5, -0.44, 0.045]}>
          <boxGeometry args={[0.75, 0.045, 0.01]} />
          <meshStandardMaterial color="#6a7570" roughness={0.5} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => {
          const x = -0.78 + (i % 4) * 0.4;
          const y = 0.08 - Math.floor(i / 4) * 0.3;
          const filled = i < 5;
          return (
            <mesh key={i} position={[x, y, 0.045]}>
              <circleGeometry args={[0.105, 32]} />
              <meshStandardMaterial
                color={filled ? "#d4b483" : "#1a2e24"}
                metalness={filled ? 0.65 : 0.2}
                roughness={0.3}
                emissive={filled ? "#d4b483" : "#000000"}
                emissiveIntensity={filled ? 0.2 : 0}
              />
            </mesh>
          );
        })}
      </group>
    </Float>
  );
}

export function WalletScene({
  className,
  transparent = false,
}: {
  className?: string;
  transparent?: boolean;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.15, 4.4], fov: 36 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        {!transparent ? <color attach="background" args={["#060908"]} /> : null}
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 7, 4]} intensity={1.4} color="#fff5e6" />
        <directionalLight position={[-4, -2, -3]} intensity={0.55} color="#d4b483" />
        <pointLight position={[0, 1.5, 2]} intensity={0.6} color="#1c3d2e" />
        <LoyaltyCard />
        <ContactShadows
          position={[0, -1.1, 0]}
          opacity={transparent ? 0.28 : 0.45}
          scale={8}
          blur={2.6}
          far={3}
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
