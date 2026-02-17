import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface SkillData {
  skill: string;
  count: number;
  color: string;
}

interface SkillsRadialChartProps {
  skills: SkillData[];
  maxCount: number;
  title?: string;
}

function SkillBar({ 
  skill, 
  count, 
  maxCount, 
  index, 
  total, 
  color 
}: { 
  skill: string; 
  count: number; 
  maxCount: number; 
  index: number; 
  total: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const angle = (index / total) * Math.PI * 2;
  const radius = 3;
  const barHeight = (count / maxCount) * 4 + 0.5;
  
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    meshRef.current.scale.y = 1 + Math.sin(time * 2 + index) * 0.05;
  });
  
  return (
    <group position={[x, 0, z]} rotation={[0, -angle, 0]}>
      <mesh ref={meshRef} position={[0, barHeight / 2, 0]}>
        <boxGeometry args={[0.3, barHeight, 0.3]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Label */}
      <Html
        position={[0, barHeight + 0.8, 0]}
        center
        distanceFactor={8}
      >
        <div className="text-center pointer-events-none">
          <div className="text-[10px] font-medium text-base-content whitespace-nowrap">
            {skill}
          </div>
          <div className="text-[8px] text-base-content/60">{count}</div>
        </div>
      </Html>
      
      {/* Connection line to center */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, barHeight, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.3} />
      </line>
    </group>
  );
}

function Scene({ skills, maxCount }: { skills: SkillData[]; maxCount: number }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4ECDC4" />
      
      {/* Center sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          emissive="#4ECDC4"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Skill bars */}
      {skills.map((skill, i) => (
        <SkillBar
          key={skill.skill}
          skill={skill.skill}
          count={skill.count}
          maxCount={maxCount}
          index={i}
          total={skills.length}
          color={skill.color}
        />
      ))}
    </>
  );
}

export default function SkillsRadialChart({ skills, maxCount, title }: SkillsRadialChartProps) {
  // Limit to top 8 skills for better visualization
  const displaySkills = skills.slice(0, 8);
  
  return (
    <div className="w-full h-64 relative">
      {title && (
        <h4 className="absolute top-0 left-0 right-0 text-center text-sm font-semibold text-base-content/80 z-10">
          {title}
        </h4>
      )}
      <Canvas camera={{ position: [0, 8, 8], fov: 50 }}>
        <Scene skills={displaySkills} maxCount={maxCount} />
      </Canvas>
    </div>
  );
}
