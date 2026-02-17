import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
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

// Individual Job Node - Small dots
function JobNode({
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
  
  // Much smaller fixed size
  const baseScale = 0.4;
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const pulseScale = isSelected 
      ? 1.5 + Math.sin(time * 4) * 0.3
      : isHovered 
        ? 1.3 
        : 1;
    
    meshRef.current.scale.setScalar(baseScale * pulseScale);
  });
  
  const opacity = isInSelectedCluster ? 1 : 0.1;
  
  if (!isInSelectedCluster && !isSelected) return null;
  
  return (
    <group position={[job.x, job.y, job.z]}>
      {/* Main dot */}
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
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          color={job.color}
          emissive={job.color}
          emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.5 : 0.2}
          transparent
          opacity={opacity}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} />
        </mesh>
      )}
      
      {/* Label on hover */}
      {isHovered && (
        <Html distanceFactor={15}>
          <div className="bg-base-100 border border-base-300 shadow-lg px-3 py-2 rounded-lg text-base-content text-xs whitespace-nowrap pointer-events-none">
            <div className="font-semibold">{job.title}</div>
            <div className="text-base-content/60 text-[10px]">Family {job.cluster_id}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Cluster Connections - Lines between jobs in same cluster
function ClusterConnections({
  cluster,
  jobs,
  isSelected,
}: {
  cluster: ClusterInfo;
  jobs: JobPoint[];
  isSelected: boolean;
}) {
  const lines = useMemo(() => {
    const clusterJobs = jobs.filter(j => j.cluster_id === cluster.id);
    if (clusterJobs.length < 3) return [];
    
    const connections: { start: number[]; end: number[] }[] = [];
    
    // Connect each job to nearest neighbors within cluster
    clusterJobs.forEach((job, i) => {
      const neighbors = clusterJobs
        .map((other, j) => ({
          job: other,
          dist: Math.sqrt(
            Math.pow(job.x - other.x, 2) +
            Math.pow(job.y - other.y, 2) +
            Math.pow(job.z - other.z, 2)
          ),
          index: j
        }))
        .filter(d => d.dist > 0 && d.dist < 25) // Only connect nearby jobs
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2);
      
      neighbors.forEach(n => {
        if (i < n.index) {
          connections.push({
            start: [job.x, job.y, job.z],
            end: [n.job.x, n.job.y, n.job.z]
          });
        }
      });
    });
    
    return connections.slice(0, 50); // Limit lines for performance
  }, [cluster, jobs]);
  
  if (!isSelected) return null;
  
  return (
    <>
      {lines.map((line, i) => (
        <Line
          key={i}
          points={[line.start as [number, number, number], line.end as [number, number, number]]}
          color={cluster.color}
          lineWidth={1}
          transparent
          opacity={0.3}
        />
      ))}
    </>
  );
}

// Cluster Label
function ClusterLabel({ cluster }: { cluster: ClusterInfo }) {
  return (
    <group position={[cluster.centroid.x, cluster.centroid.y + 6, cluster.centroid.z]}>
      <Html distanceFactor={12}>
        <div 
          className="badge badge-lg gap-1 border"
          style={{ 
            backgroundColor: 'hsl(var(--b1))',
            color: cluster.color,
            borderColor: `${cluster.color}40`
          }}
        >
          {cluster.label}
          <span className="text-base-content/40">({cluster.size})</span>
        </div>
      </Html>
    </group>
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
      minDistance={40}
      maxDistance={180}
      autoRotate={!target}
      autoRotateSpeed={0.2}
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
      {/* Light mode lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[50, 50, 50]} intensity={0.8} />
      <directionalLight position={[-50, -50, -50]} intensity={0.3} color="#e0e7ff" />
      
      {/* Clickable background for deselection */}
      <mesh onClick={handleBackgroundClick} visible={false}>
        <boxGeometry args={[500, 500, 500]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Cluster connections */}
      {clusters.map(cluster => (
        <ClusterConnections
          key={cluster.id}
          cluster={cluster}
          jobs={jobs}
          isSelected={selectedCluster === null || selectedCluster === cluster.id}
        />
      ))}
      
      {/* Cluster labels */}
      {clusters.map(cluster => (
        <ClusterLabel key={cluster.id} cluster={cluster} />
      ))}
      
      {/* Job nodes */}
      {jobs.map(job => (
        <JobNode
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
    <div className="fixed inset-0 bg-gradient-to-br from-base-200 to-base-300">
      <Canvas
        camera={{ position: [0, 0, 90], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneContent {...props} />
      </Canvas>
      
      {/* Instructions overlay */}
      <div className="absolute bottom-6 left-6 bg-base-100/90 backdrop-blur border border-base-300 rounded-lg p-4 shadow-lg">
        <h4 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-2">Navigation</h4>
        <div className="space-y-1.5 text-xs text-base-content/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Click dot to select position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-base-content/40" />
            <span>Drag to rotate view</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-base-content/40" />
            <span>Scroll to zoom</span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute top-20 right-6 bg-base-100/90 backdrop-blur border border-base-300 rounded-lg p-4 shadow-lg max-w-xs">
        <h4 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-3">Job Families</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {props.clusters
            .sort((a, b) => b.size - a.size)
            .map(c => (
              <button
                key={c.id}
                onClick={() => props.onClusterSelect(c.id === props.selectedCluster ? null : c.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                  props.selectedCluster === c.id 
                    ? 'bg-primary/10 ring-1 ring-primary' 
                    : 'hover:bg-base-200'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-base-content truncate">{c.label}</div>
                </div>
                <span className="text-xs text-base-content/40">{c.size}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
