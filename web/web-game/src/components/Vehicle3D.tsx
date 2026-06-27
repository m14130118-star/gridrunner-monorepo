import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

/* ── Per-model config ── */

const MODEL_CONFIG: Record<string, { glb: string; scale: number; posY: number; offsetX: number; offsetZ: number }> = {
  feet:   { glb: 'walk.glb', scale: 0.8,  posY: -0.15, offsetX: 0, offsetZ: 0 },
  skateboard: { glb: 'skate.glb', scale: 2.8, posY: -0.3, offsetX: 0, offsetZ: 0 },
  bicycle: { glb: 'bike.glb', scale: 0.8,  posY: -0.5, offsetX: 0, offsetZ: 0 },
  car:    { glb: 'red_car.glb', scale: 0.04, posY: -0.08, offsetX: 0, offsetZ: 0 },
};

/* ── Procedural fallbacks ── */

function ProcFeet({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => { if (g.current) g.current.position.y = Math.sin(s.clock.elapsedTime * 3) * 0.03; });
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 }), [color]);
  return (
    <group ref={g} position={[0, -0.2, 0]}>
      <mesh position={[-0.16, 0.15, 0]} castShadow><capsuleGeometry args={[0.07, 0.2, 4, 6]} /><primitive object={mat} /></mesh>
      <mesh position={[0.16, 0.15, 0]} castShadow><capsuleGeometry args={[0.07, 0.2, 4, 6]} /><primitive object={mat} /></mesh>
    </group>
  );
}

function ProcSkate({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => { if (g.current) g.current.position.y = Math.sin(s.clock.elapsedTime * 2) * 0.04; });
  const w = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 }), [color]);
  return (
    <group ref={g} position={[0, -0.16, 0]}>
      <mesh position={[0, 0.03, 0]} castShadow><boxGeometry args={[0.16, 0.022, 0.65]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} /></mesh>
      <mesh position={[0, 0.014, 0]} castShadow><boxGeometry args={[0.18, 0.016, 0.7]} /><meshStandardMaterial color="#8B4513" roughness={0.7} /></mesh>
      {[-0.22, 0.22].map(z => (
        <group key={z}>
          <mesh position={[-0.07, -0.025, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.028, 0.028, 0.03, 8]} /><primitive object={w} /></mesh>
          <mesh position={[0.07, -0.025, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.028, 0.028, 0.03, 8]} /><primitive object={w} /></mesh>
        </group>
      ))}
    </group>
  );
}

function ProcBike({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => { if (g.current) g.current.position.y = Math.sin(s.clock.elapsedTime * 2) * 0.03; });
  const fm = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }), [color]);
  const wm = useMemo(() => new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.5, metalness: 0.3 }), []);
  return (
    <group ref={g} position={[0, -0.16, 0]}>
      {[-0.22, 0.22].map((x, i) => (
        <mesh key={i} position={[x, -0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><torusGeometry args={[0.16, 0.028, 6, 12]} /><primitive object={wm} /></mesh>
      ))}
      <mesh position={[-0.04, 0.04, 0]} rotation={[0, 0, -0.4]} castShadow><cylinderGeometry args={[0.018, 0.022, 0.3, 5]} /><primitive object={fm} /></mesh>
      <mesh position={[0.04, 0.04, 0]} rotation={[0, 0, 0.4]} castShadow><cylinderGeometry args={[0.018, 0.022, 0.3, 5]} /><primitive object={fm} /></mesh>
      <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.016, 0.016, 0.26, 5]} /><primitive object={fm} /></mesh>
      <mesh position={[-0.04, 0.28, 0]} castShadow><cylinderGeometry args={[0.014, 0.016, 0.08, 5]} /><primitive object={fm} /></mesh>
      <mesh position={[-0.04, 0.33, 0]} castShadow><boxGeometry args={[0.04, 0.01, 0.08]} /><primitive object={fm} /></mesh>
      <mesh position={[0.07, 0.28, 0]} rotation={[0, 0, 0.15]} castShadow><cylinderGeometry args={[0.014, 0.016, 0.07, 5]} /><primitive object={fm} /></mesh>
    </group>
  );
}

function ProcCar({ color }: { color: string }) {
  const bm = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.6 }), [color]);
  const gm = useMemo(() => new THREE.MeshStandardMaterial({ color: '#88ccff', roughness: 0, metalness: 0, transparent: true, opacity: 0.25 }), []);
  return (
    <group position={[0, -0.13, 0]}>
      <mesh position={[0, 0.07, 0]} castShadow><boxGeometry args={[0.22, 0.07, 0.38]} /><primitive object={bm} /></mesh>
      <mesh position={[0, 0.04, 0.23]} rotation={[0.12, 0, 0]} castShadow><coneGeometry args={[0.08, 0.09, 5]} /><primitive object={bm} /></mesh>
      <mesh position={[0, 0.04, -0.23]} rotation={[-0.12, 0, 0]} castShadow><coneGeometry args={[0.08, 0.09, 5]} /><primitive object={bm} /></mesh>
      <mesh position={[0, 0.15, 0.02]} castShadow><sphereGeometry args={[0.07, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={gm} /></mesh>
      {[[-0.12, -0.035, -0.13], [0.12, -0.035, -0.13], [-0.12, -0.035, 0.13], [0.12, -0.035, 0.13]].map((p, i) => (
        <mesh key={i} position={p as any} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.022, 0.022, 0.022, 8]} /><meshStandardMaterial color="#222" roughness={0.7} /></mesh>
      ))}
    </group>
  );
}

const PROC: Record<string, (p: { color: string }) => any> = {
  feet: (p) => <ProcFeet {...p} />,
  skateboard: (p) => <ProcSkate {...p} />,
  bicycle: (p) => <ProcBike {...p} />,
  car: (p) => <ProcCar {...p} />,
};

/* ── GLB Model Loader ── */

function GLBModel({ vehicle, color, cfg }: { vehicle: string; color: string; cfg: { glb: string; scale: number; posY: number; offsetX: number; offsetZ: number } }) {
  const [groupState, setGroupState] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!cfg.glb) { setFailed(true); return; }
    let cancelled = false;
    const loader = new GLTFLoader();
    const url = `/models/${cfg.glb}`;
    loader.load(url,
      (gltf: any) => {
        if (cancelled) return;
        const s = gltf.scene as THREE.Group;
        s.traverse((c: any) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

        // Compute bounding box to center model vertically on floor
        const box = new THREE.Box3().setFromObject(s);
        const center = box.getCenter(new THREE.Vector3());
        const ws = cfg.scale;

        // Offset child so its bottom-center is at local origin, compensating for wrapper scale
        s.position.set((-center.x + cfg.offsetX) / ws, -box.min.y / ws, (-center.z + cfg.offsetZ) / ws);

        const wrapper = new THREE.Group();
        wrapper.position.set(0, cfg.posY, 0);
        wrapper.scale.set(ws, ws, ws);
        wrapper.add(s);

        setGroupState(wrapper);
      },
      undefined,
      () => { if (!cancelled) setFailed(true); }
    );
    return () => { cancelled = true; };
  }, [vehicle, cfg.glb]);

  if (!cfg.glb || failed) { const Fn = PROC[vehicle]; if (Fn) return Fn({ color }); return null; }
  if (!groupState) return null;

  return <GLBInstance groupState={groupState} cfg={cfg} />;
}

function GLBInstance({ groupState, cfg }: { groupState: THREE.Group; cfg: { posY: number; offsetX: number; offsetZ: number } }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) {
      ref.current.position.y = cfg.posY + Math.sin(s.clock.elapsedTime * 1.2) * 0.03;
      ref.current.position.x = Math.sin(s.clock.elapsedTime * 0.2) * 0.005;
      ref.current.position.z = Math.sin(s.clock.elapsedTime * 0.2) * 0.005;
      ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.3) * 0.05;
    }
  });
  return <primitive ref={ref} object={groupState} />;
}

/* ── Scene ── */

function GarageScene({ vehicle, color, onReady }: { vehicle: string; color: string; onReady: () => void }) {
  const { camera } = useThree();
  const cfg = MODEL_CONFIG[vehicle] || MODEL_CONFIG.feet;

  useEffect(() => {
    camera.position.set(0, 0.5, 1.4); camera.lookAt(0, 0, 0);
    requestAnimationFrame(() => onReady());
  }, [camera, onReady]);

  return (
    <>
      <ambientLight intensity={0.7} color="#c8d0d0" />
      <directionalLight position={[4, 6, 4]} intensity={0.5} color="#ffeedd" />
      <directionalLight position={[-3, 4, 3]} intensity={0.2} color="#8899bb" />
      <pointLight position={[0, 3.5, 1]} intensity={0.6} color="#ffeecc" distance={7} decay={1} />
      <ContactShadows position={[0, -0.02, 0]} opacity={0.25} blur={2} far={0.4} />
      <GLBModel vehicle={vehicle} color={color} cfg={cfg} />
    </>
  );
}

/* ── Exported ── */

export default function Vehicle3D({ vehicle, color = '#00e676' }: { vehicle: string; color?: string }) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  if (vehicle === 'feet' || vehicle === 'car') {
    const emoji = vehicle === 'feet' ? '🦶' : '🚗';
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 72, opacity: 0.6, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', animation: 'float 2s ease-in-out infinite' }}>{emoji}</span>
        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, opacity: 0.1, pointerEvents: 'none' }}>
          <i className="fa-solid fa-rotate fa-spin"></i>
        </div>
      )}
      <Canvas shadows dpr={[1, 1]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.5, 1.4], fov: 35 }}
        style={{ background: 'transparent', opacity: ready ? 1 : 0, transition: 'opacity 0.3s' }}
      >
        <GarageScene vehicle={vehicle} color={color} onReady={onReady} />
        <OrbitControls enableZoom={false} enablePan={false}
          maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 4}
          rotateSpeed={0.8} autoRotate autoRotateSpeed={1.5}
        />
      </Canvas>
    </div>
  );
}
