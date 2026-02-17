'use client';

import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { JobPoint, ClusterInfo } from '@/types';

interface GalaxySceneProps {
  jobs: JobPoint[];
  clusters: ClusterInfo[];
  selectedJob: JobPoint | null;
  hoveredJob: JobPoint | null;
  selectedCluster: number | null;
  onJobSelect: (job: JobPoint) => void;
  onJobHover: (job: JobPoint | null) => void;
  onClusterSelect: (clusterId: number | null) => void;
}

// Individual Job Node (Star)
function JobStar({
  job,
  isSelected,
  isHovered,
  isInSelectedCluster,
  onSelect,
  onHover,
}: {
  job: JobPoint;
  isSelected: boolean;
  isHovered: boolean;
  isInSelectedCluster: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const baseScale = job.size * 0.12;
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const pulseScale = isSelected || isHovered 
      ? 1 + Math.sin(time * 3) * 0.2 
      : 1;
    
    meshRef.current.scale.setScalar(baseScale * pulseScale);
    
    if (glowRef.current) {
      const glowScale = isSelected ? 2.5 : isHovered ? 2 : 1.5;
      glowRef.current.scale.setScalar(baseScale * glowScale * (1 + Math.sin(time * 2) * 0.1));
    }
  });
  
  const opacity = isInSelectedCluster ? 1 : 0.15;
  
  if (!isInSelectedCluster && !isSelected) return null;
  
  return (
    <group position={[job.x, job.y, job.z]}>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={job.color}
          transparent
          opacity={isSelected ? 0.3 : isHovered ? 0.2 : 0.1}
        />
      </mesh>
      
      {/* Main star */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={job.color}
          emissive={job.color}
          emissiveIntensity={isSelected ? 1 : isHovered ? 0.8 : 0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseScale * 2.5, baseScale * 2.7, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* Label on hover */}
      {isHovered && (
        <Html distanceFactor={10}>
          <div className="bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg text-white text-xs whitespace-nowrap pointer-events-none shadow-xl">
            <div className="font-semibold">{job.title}</div>
            <div className="text-gray-400 text-[10px]">Cluster {job.cluster_id}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Cluster label
function ClusterLabel({ cluster }: { cluster: ClusterInfo }) {
  return (
    <group position={[cluster.centroid.x, cluster.centroid.y + 8, cluster.centroid.z]}>
      <Html distanceFactor={8}>
        <div 
          className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap"
          style={{ 
            backgroundColor: `${cluster.color}30`,
            color: cluster.color,
            border: `1px solid ${cluster.color}50`
          }}
        >
          {cluster.label}
        </div>
      </Html>
    </group>
  );
}

// Background starfield
function BackgroundStars() {
  return (
    <Stars
      radius={200}
      depth={100}
      count={3000}
      factor={4}
      saturation={0}
      fade
      speed={0.3}
    />
  );
}

// Camera controller
function CameraController({
  target,
}: {
  target: THREE.Vector3 | null;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame(() => {
    if (target) {
      targetRef.current.lerp(target, 0.05);
    } else {
      targetRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.05);
    }
  });
  
  return (
    <OrbitControls
      target={targetRef.current}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={30}
      maxDistance={200}
      autoRotate={!target}
      autoRotateSpeed={0.3}
    />
  );
}

// Main scene content
function SceneContent({
  jobs,
  clusters,
  selectedJob,
  hoveredJob,
  selectedCluster,
  onJobSelect,
  onJobHover,
  onClusterSelect,
}: GalaxySceneProps) {
  const targetPosition = useMemo(() => {
    if (selectedJob) {
      return new THREE.Vector3(selectedJob.x, selectedJob.y, selectedJob.z);
    }
    return null;
  }, [selectedJob]);
  
  const handleBackgroundClick = useCallback(() => {
    onJobSelect(null as any);
    onClusterSelect(null);
  }, [onJobSelect, onClusterSelect]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[100, 100, 100]} intensity={0.6} />
      <pointLight position={[-100, -100, -100]} intensity={0.3} color="#4ECDC4" />
      
      {/* Background */}
      <BackgroundStars />
      
      {/* Clickable background for deselection */}
      <mesh onClick={handleBackgroundClick} visible={false}>
        <boxGeometry args={[500, 500, 500]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Cluster labels */}
      {clusters.map(cluster => (
        <ClusterLabel key={cluster.id} cluster={cluster} />
      ))}
      
      {/* Job stars */}
      {jobs.map(job => (
        <JobStar
          key={job.id}
          job={job}
          isSelected={selectedJob?.id === job.id}
          isHovered={hoveredJob?.id === job.id}
          isInSelectedCluster={selectedCluster === null || selectedCluster === job.cluster_id}
          onSelect={() => onJobSelect(job)}
          onHover={(hovered) => onJobHover(hovered ? job : null)}
        />
      ))}
      
      {/* Camera */}
      <CameraController target={targetPosition} />
    </>
  );
}

// Main Galaxy Scene component
export default function GalaxyScene(props: GalaxySceneProps) {
  return (
    <div className="fixed inset-0 bg-gray-950">
      <Canvas
        camera={{ position: [0, 0, 100], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneContent {...props} />
      </Canvas>
      
      {/* Instructions overlay */}
      <div className="absolute bottom-6 left-6 bg-gray-900/80 backdrop-blur border border-gray-800 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Controls</h4>
        <div className="space-y-1.5 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Click star to select job</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Drag to rotate view</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span>Scroll to zoom</span>
          </div>
        </div>
      </div>
    </div>
  );
}
