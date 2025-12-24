import React, { useEffect, useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import * as THREE from 'three';

// --- PHẦN 1: LOGIC AI (GIỮ NGUYÊN) ---
const gestureState = { current: 'IDLE' }; 

function HandManager() {
  const videoRef = useRef(null);
  
  useEffect(() => {
    let gestureRecognizer;
    let animationFrameId;

    const setup = async () => {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
      
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO"
      });
      
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => predict(gestureRecognizer));
        }
      }
    };

    const predict = (recognizer) => {
      if (videoRef.current && recognizer) {
        const results = recognizer.recognizeForVideo(videoRef.current, Date.now());
        
        if (results.gestures.length > 0) {
          const name = results.gestures[0][0].categoryName;
          if (name === 'Closed_Fist') gestureState.current = 'TREE';
          else if (name === 'Open_Palm') gestureState.current = 'EXPLODE';
          else if (name === 'Pointing_Up') gestureState.current = 'ATOM'; // ĐÃ ĐỔI TÊN THÀNH ATOM
          else if (name === 'ILoveYou') gestureState.current = 'HEART';
          else if (name === 'Thumb_Down') gestureState.current = 'VORTEX';
          else gestureState.current = 'IDLE'; 
        } else {
          gestureState.current = 'IDLE';
        }
      }
      animationFrameId = requestAnimationFrame(() => predict(recognizer));
    };

    setup();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return <video ref={videoRef} autoPlay playsInline muted className="fixed bottom-2 right-2 w-24 h-16 opacity-30 z-50 pointer-events-none" />;
}

// --- PHẦN 2: LOGIC 3D (THAY MƯA SAO BĂNG = NGUYÊN TỬ) ---
const COUNT = 8000;
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

function Particles() {
  const meshRef = useRef();
  
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < COUNT; i++) {
      data.push({
        pos: new THREE.Vector3((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50),
        target: new THREE.Vector3(),
        baseColor: new THREE.Color().setHSL(Math.random()*0.1+0.05, 0.9, 0.6),
        t: Math.random(), 
        offset: Math.random() * 100,
        group: i % 3 // Chia hạt thành 3 nhóm để tạo 3 vòng xoay
      });
    }
    return data;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const gesture = gestureState.current;

    particles.forEach((p, i) => {
      
      // --- CẬP NHẬT VỊ TRÍ MỚI ---

      if (gesture === 'TREE') {
        const height = 35; 
        const radius = 12 * (1 - p.t); 
        const y = (p.t * height) - height/2;
        const angle = p.t * 20 * Math.PI * 2 + time * 0.5;
        p.target.set(Math.cos(angle)*radius, y, Math.sin(angle)*radius);
      } 
      else if (gesture === 'ATOM') {
        // --- 2. NGUYÊN TỬ (ATOM) - Thay cho Mưa Sao ---
        // Chúng ta tạo 3 vòng tròn xoay quanh tâm theo 3 trục khác nhau
        
        const radius = 25; // Bán kính lớn
        const speed = time * 2 + p.offset * 0.01; // Tốc độ xoay
        
        if (p.group === 0) {
          // Vòng 1: Xoay quanh trục Y (Nằm ngang)
          p.target.set(Math.cos(speed) * radius, Math.sin(speed * 0.5) * 5, Math.sin(speed) * radius);
        } 
        else if (p.group === 1) {
          // Vòng 2: Xoay quanh trục X (Dựng đứng)
          p.target.set(Math.cos(speed) * radius, Math.sin(speed) * radius, Math.sin(speed * 0.5) * 5);
        } 
        else {
          // Vòng 3: Xoay chéo
          // Kết hợp xoay để tạo quỹ đạo chéo
          const x = Math.cos(speed) * radius;
          const y = Math.sin(speed) * radius;
          // Nghiêng 45 độ
          p.target.set(
            x * 0.7 - y * 0.7,
            x * 0.7 + y * 0.7,
            Math.sin(speed * 2) * 5
          );
        }
      }
      else if (gesture === 'HEART') {
        // Trái tim 2D chuẩn (Giữ nguyên cái thầy đã ưng)
        const t = p.t * Math.PI * 2; 
        const scale = 0.8; 
        const x = scale * 16 * Math.pow(Math.sin(t), 3);
        const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        const z = 0; 
        p.target.set(x, y + 5, z); 
      }
      else if (gesture === 'VORTEX') {
        const maxRadius = 60;
        const radius = p.t * maxRadius + Math.sin(time + p.offset)*2;
        const spinSpeed = time * (3 + (1-p.t)*4);
        const angle = p.offset + spinSpeed;
        const y = -Math.pow(1 - p.t, 2) * 15; 
        p.target.set(Math.cos(angle)*radius, y, Math.sin(angle)*radius);
      }
      else if (gesture === 'EXPLODE') {
        const r = 25 + Math.sin(time + p.t*10)*8;
        const angle = p.offset + time * 0.2;
        p.target.set(Math.cos(angle)*r*1.5, Math.sin(angle*2)*r, Math.sin(angle)*r*1.5);
      } 
      else { 
        p.target.set(Math.sin(time*0.1 + p.offset)*15, Math.cos(time*0.2 + p.t*50)*8, Math.cos(time*0.1 + p.offset)*15);
      }

      // Di chuyển hạt
      const speed = gesture === 'EXPLODE' ? 0.08 : 0.05;
      p.pos.lerp(p.target, speed);

      // --- CẬP NHẬT HÌNH DÁNG (SCALE) ---
      tempObject.position.copy(p.pos);
      
      // Ở chế độ ATOM, hạt sẽ to rõ ràng hơn
      const scale = 0.12 + Math.sin(time*5 + p.offset)*0.04;
      
      tempObject.scale.set(scale, scale, scale);
      tempObject.rotation.set(0, 0, 0); // Reset xoay (bỏ vụ xoay của mưa sao băng)
      
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      // --- CẬP NHẬT MÀU SẮC ---
      let colorForce = p.baseColor;
      
      // Màu sắc cho ATOM: Xanh công nghệ (Cyan) + Hồng + Vàng chanh
      if (gesture === 'ATOM') {
         if (p.group === 0) colorForce = new THREE.Color('#00FFFF'); // Cyan
         else if (p.group === 1) colorForce = new THREE.Color('#FF00FF'); // Magenta
         else colorForce = new THREE.Color('#7CFF00'); // Lime Green
      }
      else if (gesture === 'HEART') colorForce = new THREE.Color('#FF0000'); 
      else if (gesture === 'VORTEX') colorForce = new THREE.Color('#8A2BE2');

      const isSparkling = Math.sin(time*20 + p.offset*50) > 0.98;
      
      if (isSparkling) tempColor.setScalar(5); 
      else tempColor.copy(colorForce);
      
      meshRef.current.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial toneMapped={false} color="white" emissive="#ffaa00" emissiveIntensity={0.5} />
    </instancedMesh>
  );
}

// --- PHẦN 3: GIAO DIỆN ---
export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="w-full h-screen bg-black relative">
      {!started && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
          <button 
            onClick={() => setStarted(true)}
            className="px-8 py-4 bg-yellow-600 text-white text-2xl font-bold rounded-full hover:bg-yellow-500 transition shadow-[0_0_30px_#FFD700]"
          >
            BẤM ĐỂ BẮT ĐẦU 🎄
          </button>
        </div>
      )}

      {started && (
        <>
          <audio src="/music.mp3" autoPlay loop ref={(el) => { if(el) el.volume = 0.4; }} />

          <HandManager />
          
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-start pt-8">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] text-center">
              MERRY CHRISTMAS
            </h1>
            <p className="text-yellow-200/80 mt-1 text-lg font-bold tracking-widest">THẦY ĐỊNH CHÚC TẤT CẢ HỌC SINH AN LẠC 1 GIÁNG SINH AN LÀNH</p>
            
            <div className="mt-4 bg-black/50 p-4 rounded-xl border border-white/10 backdrop-blur-sm text-center">
                <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-white/70 text-sm font-mono">
                    <p>✊ Nắm tay: <span className="text-green-400">Cây Thông</span></p>
                    <p>🖐️ Xòe tay: <span className="text-yellow-400">Vụ Nổ</span></p>
                    {/* CẬP NHẬT TÊN HƯỚNG DẪN */}
                    <p>☝️ Ngón trỏ: <span className="text-cyan-400">Nguyên Tử</span></p> 
                    <p>🤟 I Love You: <span className="text-pink-500">Trái Tim</span></p>
                    <p>👎 Ngón cái xuống: <span className="text-purple-500">Hố Đen</span></p>
                </div>
            </div>
          </div>

          <Canvas camera={{ position: [0, 0, 50], fov: 60 }} gl={{ antialias: false }}>
            <color attach="background" args={['#000']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            
            <Suspense fallback={null}>
              <Particles />
            </Suspense>

            <EffectComposer disableNormalPass>
              <Bloom luminanceThreshold={1} intensity={1.5} radius={0.8} mipmapBlur />
            </EffectComposer>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        </>
      )}
    </div>
  );
}