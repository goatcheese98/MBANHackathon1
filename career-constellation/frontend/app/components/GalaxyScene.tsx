import { useRef, useMemo, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { JobPoint, ClusterInfo } from '@/types';
import { Network, Users, Link2, X, HelpCircle, Info, Move3d, Layers } from 'lucide-react';

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
      
      {/* Enhanced Tooltip on hover */}
      {isHovered && (
        <Html distanceFactor={15}>
          <div className="bg-base-100/95 border border-base-300 shadow-xl px-4 py-3 rounded-lg text-base-content text-xs pointer-events-none min-w-[200px]">
            <div className="font-semibold text-sm mb-1">{job.title}</div>
            <div className="text-base-content/60 text-[10px] mb-2">Family {job.cluster_id}</div>
            {job.keywords && job.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.keywords.slice(0, 4).map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-base-200 rounded text-[10px]">{kw}</span>
                ))}
                {job.keywords.length > 4 && (
                  <span className="px-1.5 py-0.5 text-[10px] text-base-content/50">+{job.keywords.length - 4}</span>
                )}
              </div>
            )}
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
    <group position={[cluster.centroid.x, cluster.centroid.y + 6, cluster.centroid.z ?? 0]}>
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

// Axis Component with bidirectional lines and labels
function AxisLinesAndLabels() {
  const axisLength = 70;
  const labelOffset = 78;
  const lineColor = "hsl(var(--bc) / 0.35)";
  
  return (
    <group>
      {/* X Axis - Bidirectional */}
      <Line points={[[-axisLength, 0, 0], [axisLength, 0, 0]]} color={lineColor} lineWidth={1.5} />
      {/* Y Axis - Bidirectional */}
      <Line points={[[0, -axisLength, 0], [0, axisLength, 0]]} color={lineColor} lineWidth={1.5} />
      {/* Z Axis - Bidirectional */}
      <Line points={[[0, 0, -axisLength], [0, 0, axisLength]]} color={lineColor} lineWidth={1.5} />
      
      {/* X Axis Labels - Both ends */}
      <group position={[labelOffset, 2, 0]}>
        <Text color="#000000" fontSize={5} anchorX="left" anchorY="middle">
          Similar Roles →
        </Text>
      </group>
      <group position={[-labelOffset, 2, 0]}>
        <Text color="#000000" fontSize={5} anchorX="right" anchorY="middle">
          ← Different Roles
        </Text>
      </group>
      
      {/* Y Axis Labels - Both ends */}
      <group position={[2, labelOffset, 0]}>
        <Text color="#000000" fontSize={5} anchorX="left" anchorY="middle">
          Senior/Complex ↑
        </Text>
      </group>
      <group position={[2, -labelOffset, 0]}>
        <Text color="#000000" fontSize={5} anchorX="left" anchorY="middle">
          Junior/Simple ↓
        </Text>
      </group>
      
      {/* Z Axis Labels - Both ends, rotated to be parallel with Z axis */}
      <group position={[0, 2, labelOffset]}>
        <Text color="#000000" fontSize={5} anchorX="center" anchorY="middle" rotation={[0, 0, 0]}>
          ← General
        </Text>
      </group>
      <group position={[0, 2, -labelOffset]}>
        <Text color="#000000" fontSize={5} anchorX="center" anchorY="middle" rotation={[0, Math.PI, 0]}>
          Specialized →
        </Text>
      </group>
    </group>
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
      
      {/* Axis Lines and Labels */}
      <AxisLinesAndLabels />
      
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

// Help Modal Component
function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-base-content">Understanding the 3D Visualization</h2>
              <p className="text-sm text-base-content/60">How to read the Job Constellation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-base-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-base-content/50" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* What is this */}
          <section>
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              What You're Looking At
            </h3>
            <p className="text-sm text-base-content/80 leading-relaxed">
              This is a 3D projection of all job positions in your organization. Each colored sphere 
              represents a specific job role. The positions are arranged in 3D space using 
              <span className="font-medium text-primary"> dimensionality reduction</span> - an AI technique 
              that places similar jobs closer together based on their descriptions, skills, and keywords.
            </p>
          </section>
          
          {/* Axes explanation */}
          <section className="bg-base-200/50 rounded-xl p-4">
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <Move3d className="w-4 h-4 text-primary" />
              The 3 Axes (What They Actually Mean)
            </h3>
            <p className="text-sm text-base-content/80 mb-4">
              These axes represent abstract dimensions from the AI analysis - not physical directions. 
              They're relative scales that help visualize patterns in your job data.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-base-100 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">X</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-base-content">Job Similarity (Horizontal)</div>
                  <div className="text-xs text-base-content/70 mt-1">
                    <span className="text-primary font-medium">Right side:</span> Roles with similar job descriptions and responsibilities<br/>
                    <span className="text-primary font-medium">Left side:</span> Roles with very different functions and tasks
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-base-100 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-success">Y</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-base-content">Competency Level (Vertical)</div>
                  <div className="text-xs text-base-content/70 mt-1">
                    <span className="text-success font-medium">Top:</span> Senior, management, complex roles requiring more skills<br/>
                    <span className="text-success font-medium">Bottom:</span> Entry-level, junior, or simpler positions
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-base-100 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-secondary">Z</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-base-content">Specialization (Depth)</div>
                  <div className="text-xs text-base-content/70 mt-1">
                    <span className="text-secondary font-medium">Front (toward you):</span> Generalist roles (applicable across departments)<br/>
                    <span className="text-secondary font-medium">Back (away):</span> Specialized roles (unique technical keywords)
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Colors & Connections */}
          <section>
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              Colors & Connections
            </h3>
            <div className="space-y-2 text-sm text-base-content/80">
              <p><span className="font-medium text-base-content">Colors:</span> Each color represents a "Job Family" - a group of related positions (e.g., Finance, HR, Engineering).</p>
              <p><span className="font-medium text-base-content">Lines:</span> Thin lines connect jobs that are semantically similar, even across different families.</p>
              <p><span className="font-medium text-base-content">Clusters:</span> Tightly grouped spheres indicate roles with overlapping skills and responsibilities.</p>
            </div>
          </section>
          
          {/* How to use */}
          <section>
            <h3 className="font-semibold text-base-content flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-primary" />
              How to Use This View
            </h3>
            <ul className="space-y-2 text-sm text-base-content/80">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong>Explore:</strong> Drag to rotate, scroll to zoom, right-click to pan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong>Filter:</strong> Click a Job Family in the sidebar to focus on specific clusters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong>Analyze:</strong> Click any sphere to see job details and connected positions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong>Find Gaps:</strong> Isolated spheres may indicate unique or niche roles</span>
              </li>
            </ul>
          </section>
        </div>
        
        <div className="p-4 border-t border-base-300 bg-base-200/30 flex justify-end">
          <button onClick={onClose} className="btn btn-primary">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// Connection Info Panel - Shows when cluster is selected
function ConnectionInfoPanel({ 
  selectedCluster, 
  clusters, 
  jobs, 
  onClear 
}: { 
  selectedCluster: number | null; 
  clusters: ClusterInfo[]; 
  jobs: JobPoint[];
  onClear: () => void;
}) {
  if (selectedCluster === null) return null;
  
  const cluster = clusters.find(c => c.id === selectedCluster);
  if (!cluster) return null;
  
  const clusterJobs = jobs.filter(j => j.cluster_id === selectedCluster);
  const connections = useMemo(() => {
    let count = 0;
    clusterJobs.forEach((job, i) => {
      clusterJobs.forEach((other, j) => {
        if (i < j) {
          const dist = Math.sqrt(
            Math.pow(job.x - other.x, 2) +
            Math.pow(job.y - other.y, 2) +
            Math.pow(job.z - other.z, 2)
          );
          if (dist < 25) count++;
        }
      });
    });
    return count;
  }, [clusterJobs]);
  
  // Find most connected job (hub)
  const hubJob = useMemo(() => {
    const connectionCounts = clusterJobs.map(job => {
      const nearby = clusterJobs.filter(other => {
        if (job.id === other.id) return false;
        const dist = Math.sqrt(
          Math.pow(job.x - other.x, 2) +
          Math.pow(job.y - other.y, 2) +
          Math.pow(job.z - other.z, 2)
        );
        return dist < 25;
      });
      return { job, count: nearby.length };
    });
    connectionCounts.sort((a, b) => b.count - a.count);
    return connectionCounts[0];
  }, [clusterJobs]);
  
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-base-100/95 backdrop-blur border border-base-300 rounded-xl p-5 shadow-2xl max-w-2xl w-[90%]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${cluster.color}20` }}
          >
            <Network className="w-5 h-5" style={{ color: cluster.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-base-content">{cluster.label}</h3>
            <p className="text-xs text-base-content/60">Family {cluster.id} • Filtered View</p>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="p-1.5 hover:bg-base-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-base-content/50" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-base-200/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-base-content/60 text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            Positions
          </div>
          <div className="text-xl font-bold text-base-content">{cluster.size}</div>
        </div>
        <div className="bg-base-200/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-base-content/60 text-xs mb-1">
            <Link2 className="w-3.5 h-3.5" />
            Connections
          </div>
          <div className="text-xl font-bold text-base-content">{connections}</div>
        </div>
        <div className="bg-base-200/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-base-content/60 text-xs mb-1">
            <Network className="w-3.5 h-3.5" />
            Central Hub
          </div>
          <div className="text-sm font-medium text-base-content truncate" title={hubJob?.job.title}>
            {hubJob?.job.title || 'N/A'}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-base-content/60 bg-base-200/30 rounded-lg p-3">
        <span className="font-medium">Connection Pattern:</span> The nodes in this family are connected based on 
        semantic similarity. Jobs closer together share more keywords and skills. 
        {hubJob && (
          <span className="mt-1 block">
            <span className="text-primary font-medium">{hubJob.job.title}</span> is the most connected position 
            with <span className="font-medium">{hubJob.count} direct connections</span> to other roles in this family.
          </span>
        )}
      </div>
    </div>
  );
}

// Main Galaxy Scene component
export default function GalaxyScene(props: GalaxySceneProps) {
  const { selectedCluster, onClusterSelect } = props;
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-base-200 to-base-300">
      <Canvas
        camera={{ position: [0, 0, 90], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
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
      
      {/* Connection Info Panel - Shows when cluster is filtered */}
      <ConnectionInfoPanel 
        selectedCluster={selectedCluster}
        clusters={props.clusters}
        jobs={props.jobs}
        onClear={() => onClusterSelect(null)}
      />
      
      {/* Help Button */}
      <button
        onClick={() => setShowHelp(true)}
        className="absolute top-20 left-6 w-10 h-10 rounded-full bg-base-100/90 backdrop-blur border border-base-300 shadow-lg flex items-center justify-center hover:bg-base-200 transition-colors z-10"
        title="How to understand this visualization"
      >
        <HelpCircle className="w-5 h-5 text-base-content/70" />
      </button>
      
      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
