"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Float } from "@react-three/drei";
import * as THREE from "three";

/* ─── Scroll hook (reads native page scroll, not drei ScrollControls) ─── */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return progress;
}

/* ─── Fog controller — adjusts fog density based on scroll ─── */
function FogController({ scrollProgress }: { scrollProgress: number }) {
  const { scene } = useThree();
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  useEffect(() => {
    scene.fog = new THREE.FogExp2("#050505", 0.12);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame(() => {
    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      // Fog thickens as user scrolls down — plate disappears into darkness
      const targetDensity = 0.12 + scrollRef.current * 0.35;
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetDensity, 0.05);
    }
  });

  return null;
}

/* ─── Floating fog particles ─── */
function FogParticles({ count = 120, scrollProgress }: { count?: number; scrollProgress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 10 - 2
        ),
        speed: 0.002 + Math.random() * 0.008,
        offset: Math.random() * Math.PI * 2,
        scale: 0.02 + Math.random() * 0.06,
      });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const scroll = scrollRef.current;

    particles.forEach((p, i) => {
      // Drift motion + scroll-driven vertical shift
      dummy.position.set(
        p.position.x + Math.sin(t * p.speed + p.offset) * 1.5,
        p.position.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.8 - scroll * 4,
        p.position.z + Math.sin(t * p.speed * 0.5) * 0.5
      );
      dummy.scale.setScalar(p.scale * (1 + Math.sin(t * 0.5 + p.offset) * 0.3));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#222222" transparent opacity={0.15} depthWrite={false} />
    </instancedMesh>
  );
}

/* ─── Volumetric light beams ─── */
function LightBeams({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const scroll = scrollRef.current;
    groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.05 + scroll * 0.3;
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.03 + Math.sin(t * 0.3 + i * 1.5) * 0.015 - scroll * 0.02;
        mat.opacity = Math.max(0, mat.opacity);
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 3, -3]}>
      {[
        { rotation: -0.3, x: -1.5 },
        { rotation: 0, x: 0 },
        { rotation: 0.3, x: 1.5 },
      ].map((beam, i) => (
        <mesh key={i} position={[beam.x, 0, 0]} rotation={[0, 0, beam.rotation]}>
          <planeGeometry args={[0.4, 12]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.035}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── The license plate mesh ─── */
function Plate({ scrollProgress }: { scrollProgress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  const texture = useTexture("/images/4AZKIDS_white.png");

  // Ensure correct color rendering on Three.js v0.152+
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  // Calculate aspect ratio from texture
  const aspect = useMemo(() => {
    const img = texture.image as HTMLImageElement | undefined;
    if (img) {
      return img.width / img.height;
    }
    return 1198 / 612; // fallback — actual saguaros-plate.jpeg dimensions (~2:1)
  }, [texture]);

  // Standard AZ plate is roughly 12"x6" = 2:1 aspect
  const plateWidth = 4;
  const plateHeight = plateWidth / aspect;
  const plateDepth = 0.08;

  useFrame(({ clock, pointer }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const scroll = scrollRef.current;

    // Scroll-driven rotation: plate tilts and orbits as you scroll
    const targetRotX = Math.sin(t * 0.3) * 0.08 + scroll * 0.6;
    const targetRotY = Math.sin(t * 0.2) * 0.12 + scroll * 1.2;
    const targetRotZ = Math.sin(t * 0.15) * 0.03;

    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotX, 0.03);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.03);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotZ, 0.03);

    // Subtle mouse follow
    meshRef.current.rotation.x += pointer.y * 0.05;
    meshRef.current.rotation.y += pointer.x * 0.08;

    // Scroll pushes plate backward into the fog
    const targetZ = -scroll * 3;
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.04);

    // Slight vertical float
    meshRef.current.position.y = Math.sin(t * 0.4) * 0.1;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <mesh ref={meshRef} castShadow>
        {/* Plate body — rounded box-like shape */}
        <boxGeometry args={[plateWidth, plateHeight, plateDepth, 1, 1, 1]} />
        <meshStandardMaterial
          color="#0a0a0a"
          roughness={0.3}
          metalness={0.8}
          envMapIntensity={0.5}
        />

        {/* Front face texture — sits slightly in front of the box */}
        <mesh position={[0, 0, plateDepth / 2 + 0.001]}>
          <planeGeometry args={[plateWidth, plateHeight]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.4}
            metalness={0.6}
            envMapIntensity={0.8}
            transparent
          />
        </mesh>

        {/* Back face — solid dark */}
        <mesh position={[0, 0, -plateDepth / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[plateWidth, plateHeight]} />
          <meshStandardMaterial color="#050505" roughness={0.9} metalness={0.2} />
        </mesh>

        {/* Edge rim glow */}
        <mesh>
          <boxGeometry args={[plateWidth + 0.04, plateHeight + 0.04, plateDepth + 0.02]} />
          <meshBasicMaterial
            color="#1a1a1a"
            transparent
            opacity={0.5}
            side={THREE.BackSide}
          />
        </mesh>
      </mesh>
    </Float>
  );
}

/* ─── Ground reflection plane ─── */
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        color="#050505"
        roughness={0.95}
        metalness={0.1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

/* ─── Main scene wrapper ─── */
function Scene({ scrollProgress }: { scrollProgress: number }) {
  return (
    <>
      <FogController scrollProgress={scrollProgress} />

      {/* Lighting — dramatic rim/key setup */}
      <ambientLight intensity={0.1} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.4}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Rim light — cool accent from behind */}
      <pointLight position={[-3, 2, -4]} intensity={0.6} color="#334466" distance={12} />
      {/* Top key — subtle warm highlight */}
      <pointLight position={[0, 4, 2]} intensity={0.3} color="#ffffee" distance={10} />
      {/* Bottom fill — very subtle */}
      <pointLight position={[0, -3, 1]} intensity={0.15} color="#111122" distance={8} />

      <Plate scrollProgress={scrollProgress} />
      <FogParticles scrollProgress={scrollProgress} />
      <LightBeams scrollProgress={scrollProgress} />
      <GroundPlane />
    </>
  );
}

/* ─── Error fallback ─── */
function WebGLFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src="/images/4AZKIDS_white.png"
        alt="Arizona Blackout Plate"
        className="w-full h-auto"
      />
    </div>
  );
}

/* ─── Exported component ─── */
export default function PlateScene() {
  const scrollProgress = useScrollProgress();
  const [webglFailed, setWebglFailed] = useState(false);

  const onCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    const canvas = state.gl.domElement;
    canvas.addEventListener("webglcontextlost", () => setWebglFailed(true));
  }, []);

  if (webglFailed) {
    return <WebGLFallback />;
  }

  return (
    <div className="w-full h-full" style={{ background: "#050505" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        onCreated={onCreated}
        style={{ background: "transparent" }}
      >
        <Scene scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
}
