import React, { useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import * as THREE from 'three';

const shared = { pts: [] };
const _obj = new THREE.Object3D();
const _clr = new THREE.Color();

function MagicHand() {
  const vRef = useRef();
  useEffect(() => {
    let gr;
    const init = async () => {
      const vis = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
      gr = await GestureRecognizer.createFromOptions(vis, {
        baseOptions: { 
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task", 
          delegate: "GPU" 
        },
        runningMode: "VIDEO",
        numHands: 1 // Quay lại 1 tay để AI đạt tốc độ phản xạ cao nhất
      });
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      if (vRef.current) vRef.current.srcObject = s;
      const loop = () => {
        if (gr && vRef.current && vRef.current.readyState >= 3) {
          const res = gr.recognizeForVideo(vRef.current, Date.now());
          // GIỮ NGUYÊN HOÀN TOÀN LOGIC HÚT HẠT BẢN CŨ THẦY ƯNG Ý
          shared.pts = (res.landmarks && res.landmarks[0]) 
            ? res.landmarks[0].map(p => new THREE.Vector3((p.x - 0.5) * 115, (0.5 - p.y) * 85, -p.z * 40)) 
            : [];
        }
        requestAnimationFrame(loop);
      };
      loop();
    };
    init();
  }, []);
  return <video ref={vRef} autoPlay playsInline muted style={{ position: 'fixed', bottom: '20px', right: '20px', width: '180px', height: '135px', zIndex: 100, border: '2px solid gold', borderRadius: '10px', transform: 'scaleX(-1)', objectFit: 'cover', opacity: 0.3 }} />;
}

function Fireflies() {
  const mRef = useRef();
  // Giảm nhẹ số lượng hạt để máy chạy mượt, AI nhạy hơn
  const ps = useMemo(() => Array.from({ length: 2800 }, () => ({ 
    pos: new THREE.Vector3((Math.random()-0.5)*160, (Math.random()-0.5)*120, 0), 
    vel: new THREE.Vector3(), 
    h: Math.random() 
  })), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const hasHand = shared.pts.length > 0;

    ps.forEach((p, i) => {
      // Logic mục tiêu: Bay lơ lửng rất nhẹ để không làm khó AI
      const target = hasHand 
        ? shared.pts[i % shared.pts.length] 
        : new THREE.Vector3(
            Math.sin(t * 0.3 + i) * 45, 
            Math.cos(t * 0.2 + i) * 35, 
            0
          );

      const force = hasHand ? 1.0 : 0.03; 
      p.vel.add(new THREE.Vector3().subVectors(target, p.pos).normalize().multiplyScalar(force)).multiplyScalar(0.91);
      p.pos.add(p.vel);

      _obj.position.copy(p.pos);
      _obj.scale.setScalar(hasHand ? 0.6 : 0.35); 
      _obj.updateMatrix();
      mRef.current.setMatrixAt(i, _obj.matrix);

      _clr.setHSL((t * 0.1 + p.h) % 1, 0.9, 0.6);
      mRef.current.setColorAt(i, _clr);
    });
    mRef.current.instanceMatrix.needsUpdate = true;
    if (mRef.current.instanceColor) mRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mRef} args={[null, null, 2800]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', overflow: 'hidden' }}>
      <MagicHand />
      <button onClick={() => document.getElementById('music').play()} style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, padding: '15px 35px', borderRadius: '50px', background: 'gold', fontWeight: 'bold', cursor: 'pointer', border: 'none', boxShadow: '0 0 20px gold' }}>BẮT ĐẦU 🎵</button>
      <audio id="music" src="./music.mp3" loop />
      <Canvas camera={{ position: [0, 0, 110] }}>
        <Suspense fallback={null}><Fireflies /></Suspense>
        <EffectComposer>
          <Bloom intensity={3.5} luminanceThreshold={0} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}