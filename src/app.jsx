import React,{useState,useEffect,useRef,useMemo} from "react";
import {createRoot} from "react-dom/client";
import * as THREE from "three";
import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {motion,AnimatePresence,useScroll,useSpring,useMotionValue,useTransform,useMotionValueEvent,animate} from "framer-motion";

/* ============ constants ============ */
const PHONE="0403 045 067", PHONE_HREF="tel:+61403045067", EMAIL="amaplumber.perth@gmail.com";
const SUBURBS=["Beldon","Banksia Grove","Kinross","Ashby","Currambine","Joondalup","Wanneroo","Ocean Reef","Mullaloo","Craigie","Woodvale","Wangara","Darch","Greenwood","Padbury","Hillarys","Carramar","Tapping","Burns Beach","Connolly","Edgewater","Hamersley","Marangaroo","Gnangara","Pearsall","Jandabap","Sinagra","Duncraig"];
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
const scrollState={p:0};

/* diagnostics pill: add ?debug to the URL to show it */
try{ if(/debug/i.test(location.search+location.hash)) document.body.classList.add("debug"); }catch(e){}

/* =====================================================================
   ROUTING CORE — plain DOM, no React involved.
   Both pages are ALWAYS rendered in the HTML. Switching a page is a
   direct `hidden` attribute flip on #pg-home / #pg-about. This cannot
   fail to display content: there is no mounting, no animation library
   and no observer anywhere on this path.
   ===================================================================== */
function getRoute(){
  let h="";
  try{ h=decodeURIComponent(location.hash||""); }catch(e){ h=location.hash||""; }
  /* accepts #/about, #about, #!/about, any case */
  return h.toLowerCase().indexOf("about")>-1 ? "about" : "home";
}
function applyRouteToDOM(r){
  const ph=document.getElementById("pg-home");
  const pa=document.getElementById("pg-about");
  if(ph) ph.hidden=(r!=="home");
  if(pa) pa.hidden=(r!=="about");
  const pill=document.getElementById("amaRoutePill");
  if(pill) pill.textContent="ROUTE: "+r.toUpperCase();
}
function setHashSafe(h){
  try{ if(location.hash!==h) location.hash=h; }catch(e){ /* some sandboxes block hash writes — the click handler still switches the page */ }
}

/* ============ icons ============ */
const WRENCH="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z";
const ICONS={
  phone:<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92Z"/>,
  mail:<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
  pin:<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  clock:<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  droplet:<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>,
  zap:<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>,
  flame:<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>,
  gauge:<><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></>,
  thermo:<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>,
  drain:<><circle cx="12" cy="12" r="7"/><path d="M5.6 9.5h12.8M5.6 14.5h12.8M9.5 5.6v12.8M14.5 5.6v12.8"/></>,
  wrench:<path d={WRENCH}/>,
  check:<path d="M20 6 9 17l-5-5"/>,
  arrow:<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  upRight:<><path d="M7 7h10v10"/><path d="M7 17 17 7"/></>,
  star:<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/>,
  send:<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
  shield:<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></>,
  menu:<><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>,
  x:<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  chevL:<path d="m15 18-6-6 6-6"/>,
  chevR:<path d="m9 18 6-6-6-6"/>,
  chevD:<path d="m6 9 6 6 6-6"/>,
  plus:<><path d="M5 12h14"/><path d="M12 5v14"/></>,
  alert:<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  home:<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/></>,
  eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
  orbit:<><circle cx="12" cy="12" r="3"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="m15.7 15.7 4.5 4.5M4.5 4.5l4.5 4.5"/></>,
};
function Icon({name,size=20,stroke=1.7,filled=false,className}){
  return(<svg className={className} width={size} height={size} viewBox="0 0 24 24"
    fill={filled?"currentColor":"none"} stroke={filled?"none":"currentColor"}
    strokeWidth={filled?0:stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]||null}</svg>);
}

/* ============ logo ============ */
function Logo({h=46}){
  return(<img src="img/2022-12-05_08_17_09-Facebook-removebg-preview.png" alt="AmaPlumber Plumbing & Gas" loading="eager" className="logo-img" style={{height:h,width:"auto",display:"block"}}/>);
}

/* ============ shared UI bits ============ */
function FlowLine(){
  return(<svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
    <line x1="0" y1="5" x2="34" y2="5" stroke="rgba(167,182,220,.3)" strokeWidth="1.5"/>
    <line x1="0" y1="5" x2="10" y2="5" stroke="#a7b6dc" strokeWidth="2" strokeLinecap="round">
      <animate attributeName="x1" values="-10;24" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="0;34" dur="1.6s" repeatCount="indefinite"/>
    </line>
  </svg>);
}
function Reveal({children,delay=0,y=30,className,style}){
  return(<motion.div className={className} style={style}
    initial={{opacity:0,y,filter:"blur(4px)"}}
    whileInView={{opacity:1,y:0,filter:"blur(0px)"}}
    viewport={{once:true,margin:"-60px"}}
    transition={{duration:.75,delay,ease:[0.22,1,0.36,1]}}>{children}</motion.div>);
}
function Rise({children,delay=0,className="",style}){
  return(<div className={"rise "+className} style={{animationDelay:delay+"s",...style}}>{children}</div>);
}
function SectionHead({kicker,title,sub}){
  return(<Reveal className="shead">
    <span className="kick"><FlowLine/>{kicker}</span>
    <h2>{title}</h2>
    {sub&&<p>{sub}</p>}
  </Reveal>);
}
function Magnetic({children}){
  const ref=useRef();
  const x=useMotionValue(0),y=useMotionValue(0);
  const sx=useSpring(x,{stiffness:180,damping:14,mass:.4}),sy=useSpring(y,{stiffness:180,damping:14,mass:.4});
  return(<motion.div ref={ref} className="mag" style={{x:sx,y:sy}}
    onMouseMove={e=>{const r=ref.current.getBoundingClientRect();x.set((e.clientX-(r.left+r.width/2))*.3);y.set((e.clientY-(r.top+r.height/2))*.3);}}
    onMouseLeave={()=>{x.set(0);y.set(0);}}>{children}</motion.div>);
}
function Stars({size=14}){
  return(<>{[0,1,2,3,4].map(s=><Icon key={s} name="star" filled size={size}/>)}</>);
}

/* ============ 3D hero ============ */
const FAUCET_X=3.4;
const SPOUT={x:FAUCET_X-1,y:.08,floor:-1.56};
const STREAM_LEN=SPOUT.y-SPOUT.floor;
const MAT={
  steel:new THREE.MeshStandardMaterial({color:"#a7aec0",metalness:.92,roughness:.3}),
  steelDark:new THREE.MeshStandardMaterial({color:"#5f6a80",metalness:.85,roughness:.42}),
  orange:new THREE.MeshStandardMaterial({color:"#E75603",metalness:.5,roughness:.32}),
  water:new THREE.MeshPhysicalMaterial({transmission:.92,thickness:.7,roughness:.12,ior:1.33,clearcoat:.5,
    attenuationColor:new THREE.Color("#394C7F"),attenuationDistance:1.3,color:"#f2f5fc"}),
  drop:new THREE.MeshStandardMaterial({color:"#c6d2ee",emissive:"#1c2743",emissiveIntensity:.4,roughness:.15,metalness:.1,transparent:true,opacity:.9}),
};
function EnvMap(){
  const {scene}=useThree();
  useEffect(()=>{
    const c=document.createElement("canvas");c.width=256;c.height=128;
    const g=c.getContext("2d");
    const gr=g.createLinearGradient(0,0,0,128);
    gr.addColorStop(0,"#dfe7f7");gr.addColorStop(.45,"#26355c");gr.addColorStop(1,"#070b15");
    g.fillStyle=gr;g.fillRect(0,0,256,128);
    g.fillStyle="rgba(255,255,255,.7)";g.fillRect(30,18,60,8);
    g.fillStyle="rgba(231,86,3,.45)";g.fillRect(150,40,70,8);
    g.fillStyle="rgba(167,182,220,.45)";g.fillRect(200,90,40,6);
    const tex=new THREE.CanvasTexture(c);
    tex.mapping=THREE.EquirectangularReflectionMapping;
    tex.colorSpace=THREE.SRGBColorSpace;
    scene.environment=tex;
  },[scene]);
  return null;
}
function Rig({children}){
  const g=useRef();
  const rot=useRef({x:0,y:0,ux:0,uy:0});
  const {gl,camera,size}=useThree();
  useEffect(()=>{
    const el=gl.domElement; let drag=false,lx=0,ly=0;
    el.style.cursor="grab"; el.style.touchAction="pan-y";
    const down=e=>{drag=true;lx=e.clientX;ly=e.clientY;el.style.cursor="grabbing";};
    const move=e=>{if(!drag)return;
      const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;
      rot.current.uy=clampN(rot.current.uy+dx*.0038,-.34,.34);
      rot.current.ux=clampN(rot.current.ux+dy*.002,-.16,.22);};
    const up=()=>{drag=false;el.style.cursor="grab";};
    el.addEventListener("pointerdown",down);
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",up);
    window.addEventListener("pointercancel",up);
    return()=>{el.removeEventListener("pointerdown",down);window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);window.removeEventListener("pointercancel",up);};
  },[gl]);
  useFrame((s,d)=>{
    const r=rot.current,t=s.clock.elapsedTime;
    const ty=-.07+Math.sin(t*.32)*.05+r.uy;
    const tx=.03+Math.sin(t*.47)*.02+r.ux;
    r.x+=(tx-r.x)*Math.min(1,d*4);
    r.y+=(ty-r.y)*Math.min(1,d*4);
    const p=scrollState.p;
    g.current.rotation.set(r.x,r.y+p*.45,0);
    g.current.position.y=p*1.55;
    const fr=size.width<680
      ?{s:.62,l:[1.15,-.32,0]}
      :size.width<1150
      ?{s:.8,l:[1.0,-.16,0]}
      :{s:.95,l:[.6,-.1,0]};
    g.current.scale.setScalar(fr.s);
    camera.position.x+=(s.pointer.x*.3-camera.position.x)*Math.min(1,d*2);
    camera.position.y+=((.15+s.pointer.y*.15)-camera.position.y)*Math.min(1,d*2);
    camera.lookAt(...fr.l);
  });
  return <group ref={g}>{children}</group>;
}
function shadowTex(){
  const c=document.createElement("canvas");c.width=c.height=128;
  const g=c.getContext("2d");
  const r=g.createRadialGradient(64,64,4,64,64,62);
  r.addColorStop(0,"rgba(0,0,0,.75)");r.addColorStop(1,"rgba(0,0,0,0)");
  g.fillStyle=r;g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
function Blob({x,z,sx,sz,o}){
  const tex=useMemo(shadowTex,[]);
  return(<mesh rotation={[-Math.PI/2,0,0]} position={[x,-1.62,z]} scale={[sx,sz,1]}>
    <planeGeometry args={[1,1]}/>
    <meshBasicMaterial map={tex} transparent opacity={o} depthWrite={false}/>
  </mesh>);
}
function Handle({on,onToggle}){
  const g=useRef(); const spin=useRef(0); const target=useRef(0);
  const first=useRef(true);
  useEffect(()=>{
    if(first.current){first.current=false;return;}
    target.current+=(on?1:-1)*Math.PI*1.5;
  },[on]);
  useFrame((_,d)=>{spin.current+=(target.current-spin.current)*Math.min(1,d*4.5);if(g.current)g.current.rotation.y=spin.current;});
  const {gl}=useThree();
  return(<group position={[-.5,1.3,0]}
    onClick={e=>{e.stopPropagation();onToggle();}}
    onPointerOver={e=>{e.stopPropagation();gl.domElement.style.cursor="pointer";}}
    onPointerOut={()=>{gl.domElement.style.cursor="grab";}}>
    <mesh position={[0,-.02,0]} material={MAT.orange}><cylinderGeometry args={[.055,.07,.1,24]}/></mesh>
    <group ref={g}>
      <mesh rotation={[Math.PI/2,0,0]} material={MAT.orange}><torusGeometry args={[.19,.034,16,40]}/></mesh>
      {[0,1,2].map(i=>(<mesh key={i} rotation={[Math.PI/2,0,i*Math.PI/3]} material={MAT.orange}><cylinderGeometry args={[.024,.024,.36,10]}/></mesh>))}
      <mesh material={MAT.orange}><sphereGeometry args={[.048,16,16]}/></mesh>
      <mesh><sphereGeometry args={[.4,10,10]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    </group>
  </group>);
}
function Faucet({on,onToggle}){
  return(<group position={[FAUCET_X,0,0]}>
    <mesh position={[0,-1.62,0]} material={MAT.steelDark}><cylinderGeometry args={[.3,.36,.18,32]}/></mesh>
    <mesh position={[0,-.53,0]} material={MAT.steel}><cylinderGeometry args={[.13,.15,2.3,32]}/></mesh>
    <mesh position={[0,-.15,0]} material={MAT.steelDark}><cylinderGeometry args={[.185,.185,.12,32]}/></mesh>
    <mesh position={[0,.62,0]} material={MAT.steel}><sphereGeometry args={[.135,24,24]}/></mesh>
    <mesh position={[-.5,.62,0]} material={MAT.steel}><torusGeometry args={[.5,.115,24,48,Math.PI]}/></mesh>
    <mesh position={[-1,.4,0]} material={MAT.steel}><cylinderGeometry args={[.115,.115,.44,32]}/></mesh>
    <mesh position={[-1,.13,0]} material={MAT.steelDark}><cylinderGeometry args={[.12,.09,.12,32]}/></mesh>
    <mesh position={[-.5,1.16,0]} material={MAT.steelDark}><cylinderGeometry args={[.07,.09,.16,24]}/></mesh>
    <Handle on={on} onToggle={onToggle}/>
  </group>);
}
function FlowCtl({on,flowRef}){
  useFrame((_,d)=>{flowRef.current+=((on?1:0)-flowRef.current)*Math.min(1,d*2.6);});
  return null;
}
function Stream({flowRef}){
  const m=useRef();
  useFrame(s=>{
    const f=flowRef.current;
    const sy=Math.max(.0015,f);
    m.current.scale.set(1,sy,1);
    m.current.position.y=SPOUT.y-(STREAM_LEN*sy)/2;
    if(f>.4){const w=Math.sin(s.clock.elapsedTime*9)*.06;m.current.scale.x=1+w;m.current.scale.z=1-w;}
    else{m.current.scale.x=1;m.current.scale.z=1;}
  });
  return(<mesh ref={m} position={[SPOUT.x,SPOUT.y-STREAM_LEN/2,0]} material={MAT.water}>
    <cylinderGeometry args={[.055,.038,STREAM_LEN,24,1,true]}/>
  </mesh>);
}
function StreamFlow({flowRef}){
  const ref=useRef(); const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const N=42;
  const seeds=useMemo(()=>Array.from({length:N},()=>({t:Math.random(),v:.9+Math.random()*.7,o:(Math.random()-.5)*.045,s:.7+Math.random()*.6,ph:Math.random()*6.28})),[]);
  useFrame((s,d)=>{
    const f=flowRef.current;
    for(let i=0;i<N;i++){const q=seeds[i];
      q.t=(q.t+q.v*d)%1;
      const y=SPOUT.y-q.t*STREAM_LEN;
      const live=y>SPOUT.y-STREAM_LEN*f-.02;
      dummy.position.set(SPOUT.x+q.o+Math.sin(q.t*18+q.ph)*.012,y,0);
      dummy.scale.setScalar(live?.034*q.s*f:.0001);
      dummy.updateMatrix();ref.current.setMatrixAt(i,dummy.matrix);}
    ref.current.instanceMatrix.needsUpdate=true;
  });
  return(<instancedMesh ref={ref} args={[null,null,N]} frustumCulled={false} material={MAT.drop}>
    <sphereGeometry args={[1,10,10]}/>
  </instancedMesh>);
}
function Splash({flowRef}){
  const ref=useRef(); const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const N=22;
  const parts=useMemo(()=>Array.from({length:N},()=>({p:new THREE.Vector3(0,-99,0),v:new THREE.Vector3(),l:0,max:1})),[]);
  const acc=useRef(0);
  useFrame((_,d)=>{
    const f=flowRef.current;
    if(f>.35){acc.current+=d*26*f;
      for(const q of parts){if(acc.current<=0)break;
        if(q.l<=0){acc.current-=1;
          q.p.set(SPOUT.x+(Math.random()-.5)*.1,SPOUT.floor+.03,(Math.random()-.5)*.08);
          const a=Math.random()*Math.PI*2,sp=.5+Math.random()*1.1;
          q.v.set(Math.cos(a)*sp*.8,1+Math.random()*1.6,Math.sin(a)*sp*.8);
          q.l=q.max=.4+Math.random()*.4;}}}
    for(let i=0;i<N;i++){const q=parts[i];
      if(q.l>0){q.l-=d;q.v.y-=4.6*d;q.p.addScaledVector(q.v,d);
        dummy.position.copy(q.p);dummy.scale.setScalar(Math.max(.001,Math.min(1,q.l/(q.max*.5)))*.03);}
      else{dummy.position.set(0,-99,0);dummy.scale.setScalar(.0001);}
      dummy.updateMatrix();ref.current.setMatrixAt(i,dummy.matrix);}
    ref.current.instanceMatrix.needsUpdate=true;
  });
  return(<instancedMesh ref={ref} args={[null,null,N]} frustumCulled={false} material={MAT.drop}>
    <sphereGeometry args={[1,8,8]}/>
  </instancedMesh>);
}
function Puddle({flowRef}){
  const rs=useRef([]);
  useFrame(s=>{
    for(let i=0;i<3;i++){const m=rs.current[i];if(!m)continue;
      const T=2.1,t=((s.clock.elapsedTime+i*.7)%T)/T;
      const sc=.3+t*1.7;
      m.scale.set(sc,sc,sc);
      m.material.opacity=(1-t)*(.15+.7*flowRef.current);}
  });
  return(<group position={[SPOUT.x,SPOUT.floor,0]}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.002,0]}>
      <circleGeometry args={[.78,48]}/>
      <meshStandardMaterial color="#131f3a" roughness={.18} metalness={.55} envMapIntensity={1.1}/>
    </mesh>
    {[0,1,2].map(i=>(<mesh key={i} ref={el=>rs.current[i]=el} rotation={[-Math.PI/2,0,0]} position={[0,.006+i*.002,0]}>
      <ringGeometry args={[.42,.47,48]}/>
      <meshBasicMaterial color="#a7b6dc" transparent opacity={.4} depthWrite={false}/>
    </mesh>))}
  </group>);
}
function Drip({flowRef}){
  const m=useRef(); const st=useRef({cool:1.6,active:false,y:SPOUT.y});
  useFrame((_,d)=>{
    const f=flowRef.current; const o=st.current;
    if(f>.25){o.active=false;if(m.current)m.current.scale.setScalar(.0001);return;}
    if(!o.active){o.cool-=d;
      if(o.cool<=0){o.active=true;o.y=SPOUT.y;o.cool=1.8+Math.random()*1.4;}}
    else{o.y-=d*2.4;
      if(o.y<=SPOUT.floor){o.active=false;}}
    if(m.current){m.current.position.set(SPOUT.x,o.active?o.y:SPOUT.y,0);
      m.current.scale.setScalar(o.active?.05:.0001);}
  });
  return(<mesh ref={m} material={MAT.drop}><sphereGeometry args={[1,12,12]}/></mesh>);
}

/* ============ header ============ */
const NAV=[
  {label:"Home",href:"#home",go:"home"},
  {label:"Services",href:"#services",section:"#services"},
  {label:"About",href:"#/about",go:"about"},
  {label:"Projects",href:"#projects",section:"#projects"},
  {label:"Testimonials",href:"#testimonials",section:"#testimonials"},
  {label:"Contact",href:"#contact",section:"#contact"},
];
function Header({route,go}){
  const [sc,setSc]=useState(false);
  const [menu,setMenu]=useState(false);
  useEffect(()=>{const f=()=>setSc(window.scrollY>30);f();window.addEventListener("scroll",f,{passive:true});return()=>window.removeEventListener("scroll",f);},[]);
  useEffect(()=>{document.body.style.overflow=menu?"hidden":"";},[menu]);
  const navClick=(fn)=>(e)=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button===1)return;
    e.preventDefault(); setMenu(false); fn();
  };
  return(<>
    <motion.header className={"hdr"+(sc?" on":"")} initial={{y:-70,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:.8,ease:[0.22,1,0.36,1]}}>
      <div className="hdr-in">
        <a href="#home" className="brand" aria-label="AmaPlumber Plumbing & Gas — home"
          onClick={navClick(()=>go.home())}><Logo h={46}/></a>
        <nav className="hdr-nav">
          {NAV.map(l=>(
            <a key={l.label} href={l.href}
              className={(l.go==="about"&&route==="about")?"active":""}
              onClick={navClick(()=>l.go?go[l.go]():go.section(l.section))}>{l.label}</a>))}
        </nav>
        <div className="hdr-r">
          <a className="btn btn-copper btn-sm" href={PHONE_HREF}><Icon name="phone" size={15}/><span className="hdr-num">{PHONE}</span></a>
          <button className="burger" onClick={()=>setMenu(true)} aria-label="Open menu"><Icon name="menu" size={21}/></button>
        </div>
      </div>
    </motion.header>
    <AnimatePresence>{menu&&(
      <motion.div className="mmenu" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.3}}>
        <button className="mm-x" onClick={()=>setMenu(false)} aria-label="Close menu"><Icon name="x" size={22}/></button>
        <nav>{NAV.map((l,i)=><motion.a key={l.label} href={l.href}
          onClick={navClick(()=>l.go?go[l.go]():go.section(l.section))}
          initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.08+i*.06,duration:.5,ease:[0.22,1,0.36,1]}}>{l.label}</motion.a>)}</nav>
        <motion.a className="btn btn-copper" href={PHONE_HREF} initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.46}}>
          <Icon name="phone" size={17}/>Call {PHONE}</motion.a>
        <span className="mm-note">Open 24 hours — Beldon, Perth WA</span>
      </motion.div>)}
    </AnimatePresence>
  </>);
}

/* ============ hero ============ */
function Hero({active}){
  const [on,setOn]=useState(true);
  const flowRef=useRef(1);
  const {scrollYProgress}=useScroll();
  useMotionValueEvent(scrollYProgress,"change",v=>{scrollState.p=Math.min(1,v*2.6);});
  const wrap={hidden:{},show:{transition:{staggerChildren:.09,delayChildren:.25}}};
  const word={hidden:{y:"115%",rotate:3},show:{y:"0%",rotate:0,transition:{duration:.9,ease:[0.22,1,0.36,1]}}};
  const fade={hidden:{opacity:0,y:18},show:{opacity:1,y:0,transition:{duration:.8,ease:[0.22,1,0.36,1]}}};
  return(<section className="hero" id="home">
    <div className="hero-bg"/>
    <div className="hero-canvas" aria-hidden="true">
      <Canvas dpr={[1,1.8]} camera={{fov:40,position:[.4,.15,8.6],near:.1,far:60}}
        frameloop={active?"always":"never"}
        gl={{antialias:true,alpha:true,powerPreference:"high-performance"}}
        onCreated={({gl})=>{gl.toneMappingExposure=1.1;}}>
        <fog attach="fog" args={["#0a0e1a",10,20]}/>
        <ambientLight intensity={.5}/>
        <directionalLight position={[4,7,5]} intensity={1.55} color="#eef2fc"/>
        <pointLight position={[-1.5,1.5,4]} intensity={9} distance={12} decay={2} color="#7f95cc"/>
        <pointLight position={[FAUCET_X+1.7,.8,-1.6]} intensity={7} distance={10} decay={2} color="#E75603"/>
        <EnvMap/>
        <FlowCtl on={on} flowRef={flowRef}/>
        <Rig>
          <Blob x={FAUCET_X} z={.1} sx={2.4} sz={1.4} o={.45}/>
          <Faucet on={on} onToggle={()=>setOn(o=>!o)}/>
          <Stream flowRef={flowRef}/>
          <StreamFlow flowRef={flowRef}/>
          <Splash flowRef={flowRef}/>
          <Puddle flowRef={flowRef}/>
          <Drip flowRef={flowRef}/>
        </Rig>
      </Canvas>
    </div>
    <div className="hero-scrim"/><div className="hero-fade"/>
    <div className="wrap hero-in">
      <motion.div className="hero-copy" variants={wrap} initial="hidden" animate="show">
        <motion.span className="eyebrow glass pe" variants={fade}><i className="dot"/>Licensed Plumbers &amp; Gas Fitters — Beldon, WA</motion.span>
        <h1>
          <span className="hl"><motion.span className="hw" variants={word}>Honest</motion.span><motion.span className="hw" variants={word}>plumbing,</motion.span></span>
          <span className="hl"><motion.span className="hw" variants={word}>done</motion.span>
            <motion.span className="hw acc" variants={word}>properly.
              <svg className="uline" viewBox="0 0 230 16" preserveAspectRatio="none" aria-hidden="true">
                <motion.path d="M5 11 C60 3 160 3 225 9" fill="none" stroke="#E75603" strokeWidth="5" strokeLinecap="round"
                  initial={{pathLength:0}} animate={{pathLength:1}} transition={{delay:1.15,duration:.75,ease:"easeOut"}}/>
              </svg>
            </motion.span></span>
        </h1>
        <motion.p className="hero-sub" variants={fade}>AmaPlumber is a family-run plumbing &amp; gas crew based north of Perth. Blocked drains, hot water systems, burst pipes and gas work — fixed fast, priced fair, left tidy. On call <strong>24/7</strong>.</motion.p>
        <motion.div className="hero-cta" variants={fade}>
          <Magnetic><a className="btn btn-copper pe" href={PHONE_HREF}><Icon name="phone" size={17}/>Call {PHONE}</a></Magnetic>
          <Magnetic><a className="btn btn-ghost pe" href="#services"
            onClick={e=>{e.preventDefault();scrollToSection("#services");}}>Explore our services<Icon name="arrow" size={16}/></a></Magnetic>
        </motion.div>
        <motion.div className="hero-facts" variants={fade}>
          <span className="hf"><Icon name="clock" size={16}/>24/7 emergency call-outs</span>
          <span className="hf"><Icon name="home" size={16}/>Residential &amp; commercial</span>
          <span className="hf"><Icon name="zap" size={16}/>Same-day hot water</span>
        </motion.div>
      </motion.div>
    </div>
    <motion.div className="hero-hint glass" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:1.8,duration:.8}}>
      <Icon name="orbit" size={14}/>Drag to look around — tap the handle</motion.div>
    <div className="hero-scr" aria-hidden="true"><span>Scroll</span><i><b/></i></div>
    <div className="marquee" aria-hidden="true">
      <span className="mq-label glass">Servicing Perth's north</span>
      <div className="marquee-track">{[0,1].map(k=>(
        <div className="mq-in" key={k} aria-hidden={k===1}>{SUBURBS.map(s=><span key={s}><i/>{s}</span>)}</div>))}</div>
    </div>
  </section>);
}
function scrollToSection(id){
  try{
    const el=document.querySelector(id);
    if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){}
}

/* ============ emergency band ============ */
function EmergencyBand(){
  return(<section className="eband">
    <div className="wrap eband-in">
      <div className="eband-l">
        <span className="eband-ic"><Icon name="alert" size={21}/><i className="pulse-ring"/></span>
        <p><strong>Burst pipe? No hot water?</strong> We're on call — right now, anywhere north of the river.</p>
      </div>
      <div className="eband-r">
        <span className="live"><i className="dot"/>On duty 24/7</span>
        <a className="btn btn-ghost btn-sm" href={PHONE_HREF}><Icon name="phone" size={15}/>{PHONE}</a>
      </div>
    </div>
  </section>);
}

/* ============ schematic art ============ */
let svCount=0;
function Schematic({children}){
  const pid=useMemo(()=>"svp"+(++svCount),[]);
  return(<svg className="sv" viewBox="0 0 360 240" aria-hidden="true">
    <defs><pattern id={pid} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="rgba(167,182,220,.09)"/></pattern></defs>
    <rect width="360" height="240" fill={"url(#"+pid+")"}/>
    <path d="M14 28V14h14M332 14h14v14M346 212v14h-14M28 226H14v-14" fill="none" stroke="rgba(223,231,247,.18)" strokeWidth="1.5"/>
    {children}
  </svg>);
}
const Pipe=({d,w=14,dash})=>(<>
  <path d={d} stroke="rgba(223,231,247,.22)" strokeWidth={w+4} fill="none" strokeLinecap="round"/>
  <path d={d} stroke="#18213a" strokeWidth={w} fill="none" strokeLinecap="round"/>
  {dash&&<path d={d} stroke="rgba(167,182,220,.6)" strokeWidth={w-8} fill="none" strokeDasharray="7 11" style={{animation:"svDash 1.4s linear infinite"}}/>}
</>);
function PlumbingArt(){return(
  <Schematic>
    <rect x="44" y="196" width="272" height="16" rx="8" className="met"/>
    <rect x="58" y="188" width="244" height="12" rx="6" fill="rgba(167,182,220,.12)"/>
    <Pipe d="M71 100 H158 q22 0 22 22 v14" w={22}/>
    <rect x="58" y="84" width="26" height="106" rx="9" className="met"/>
    <rect x="66" y="72" width="10" height="14" rx="3" fill="#18213a" stroke="rgba(223,231,247,.28)"/>
    <circle cx="71" cy="62" r="12" className="cop-st" strokeWidth="3" fill="rgba(231,86,3,.12)"/>
    <circle cx="71" cy="62" r="3" className="cop"/>
    <path d="M284 58h24M296 46v24" stroke="rgba(223,231,247,.25)"/>
    <circle cx="180" cy="144" r="5.5" fill="#a7b6dc" style={{transformBox:"fill-box",transformOrigin:"center",animation:"svDrop 2.6s cubic-bezier(.55,0,.9,.4) infinite"}}/>
    <ellipse cx="180" cy="194" rx="13" ry="3.5" fill="none" stroke="#a7b6dc" strokeWidth="1.6" style={{transformBox:"fill-box",transformOrigin:"center",animation:"svRipple 2.6s ease-out .1s infinite"}}/>
    <ellipse cx="180" cy="194" rx="8" ry="2.4" fill="rgba(167,182,220,.35)" style={{transformBox:"fill-box",transformOrigin:"center",animation:"svRipple 2.6s ease-out .2s infinite"}}/>
  </Schematic>);}
function EmergencyArt(){return(
  <Schematic>
    <rect x="46" y="104" width="236" height="36" rx="10" className="met"/>
    <rect x="38" y="98" width="18" height="48" rx="6" className="met"/>
    <rect x="272" y="98" width="18" height="48" rx="6" className="met"/>
    <path d="M150 104 l6 9 -8 8 7 9" fill="none" stroke="#a7b6dc" strokeWidth="2"/>
    {[0,1,2,3,4].map(i=>(<circle key={i} cx={152+(i-2)*4} cy={142} r={2.6+i*.4} fill="#a7b6dc"
      style={{["--dx"]:((i-2)*13)+"px",["--dy"]:(24+i*6)+"px",animation:"svSpray 4.6s linear infinite",animationDelay:(i*.22)+"s"}}/>))}
    <ellipse cx="168" cy="204" rx="34" ry="5" fill="rgba(167,182,220,.18)"
      style={{transformBox:"fill-box",transformOrigin:"0% 50%",animation:"svPuddle 4.6s ease-in-out infinite"}}/>
    <g transform="translate(152,112) scale(1.7)">
      <g style={{transformBox:"fill-box",transformOrigin:"center",animation:"svWrench 4.6s cubic-bezier(.6,0,.3,1) infinite"}}>
        <path transform="translate(-12,-12)" d={WRENCH} fill="none" stroke="#E75603" strokeWidth="1.6" strokeLinejoin="round"/>
      </g>
    </g>
    <circle cx="306" cy="48" r="13" fill="none" stroke="rgba(231,86,3,.5)" strokeWidth="1.5"/>
    <circle cx="306" cy="48" r="13" fill="none" stroke="#E75603" strokeWidth="1.5" style={{transformBox:"fill-box",transformOrigin:"center",animation:"svPulse 2.4s ease-out infinite"}}/>
    <path d="M308 39 l-5 9 h4 l-2 9 6-10 h-4 Z" fill="#E75603"/>
  </Schematic>);}
function GasArt(){return(
  <Schematic>
    <path d="M148 176 h64 l-8 -14 h-48 Z" className="met"/>
    <ellipse cx="180" cy="162" rx="34" ry="6" className="met"/>
    <ellipse cx="180" cy="162" rx="26" ry="4" fill="#0c1424"/>
    <g style={{transformBox:"fill-box",transformOrigin:"50% 100%",animation:"svFlame .9s ease-in-out infinite"}}>
      <path d="M180 66 C196 88 208 106 208 124 a28 28 0 0 1-56 0 C152 106 164 88 180 66Z" fill="rgba(167,182,220,.14)" stroke="rgba(167,182,220,.5)" strokeWidth="1.5"/>
    </g>
    <g style={{transformBox:"fill-box",transformOrigin:"50% 100%",animation:"svFlame .7s ease-in-out infinite reverse"}}>
      <path d="M180 96 C190 110 197 120 197 131 a17 17 0 0 1-34 0 C163 120 170 110 180 96Z" fill="rgba(200,214,244,.5)"/>
      <path d="M180 116 C184 122 188 127 188 132 a8 8 0 0 1-16 0 C172 127 176 122 180 116Z" fill="#dfe7f7"/>
    </g>
    <Pipe d="M214 168 H268 q10 0 10 -10 V112" w={10}/>
    <Pipe d="M60 176 H140" w={12} dash/>
    <circle cx="278" cy="88" r="26" className="met" fill="#0e1830"/>
    {[-60,-30,0,30,60].map(a=>{const rad=a*Math.PI/180,s=Math.sin(rad),c=Math.cos(rad);
      return <line key={a} x1={278+s*18} y1={88-c*18} x2={278+s*23} y2={88-c*23} stroke="rgba(223,231,247,.35)" strokeWidth="1.5"/>;})}
    <rect x="276.8" y="68" width="2.4" height="20" rx="1.2" fill="#E75603" style={{transformBox:"fill-box",transformOrigin:"50% 100%",animation:"svNeedle 3.2s ease-in-out infinite"}}/>
    <circle cx="278" cy="88" r="3.5" className="cop"/>
  </Schematic>);}
function BoilerArt(){return(
  <Schematic>
    {[0,1,2].map(i=>(<path key={i} d={"M"+(126+i*34)+" 44 q6 8 0 16 q-6 8 0 14"} fill="none" stroke="rgba(167,182,220,.4)" strokeWidth="2" strokeLinecap="round"
      style={{transformBox:"fill-box",transformOrigin:"center",animation:"svHeat 2.4s ease-in-out "+(i*.4)+"s infinite"}}/>))}
    <Pipe d="M100 150 H64 V196" w={14} dash/>
    <Pipe d="M220 150 h36 v46" w={14} dash/>
    <rect x="100" y="56" width="120" height="130" rx="26" className="met"/>
    <circle cx="160" cy="112" r="24" fill="rgba(10,17,30,.9)" stroke="rgba(223,231,247,.3)"/>
    <g style={{transformBox:"fill-box",transformOrigin:"50% 100%",animation:"svFlame .75s ease-in-out infinite"}}>
      <path d="M160 92 c8 10 14 18 14 26 a14 14 0 0 1-28 0 c0-8 6-16 14-26Z" fill="rgba(231,86,3,.85)"/>
      <path d="M160 104 c4 5 7 9 7 13 a7 7 0 0 1-14 0 c0-4 3-8 7-13Z" fill="rgba(255,205,160,.95)"/>
    </g>
    {[[112,68],[208,68],[112,174],[208,174]].map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="rgba(223,231,247,.3)"/>)}
    <circle cx="204" cy="88" r="3.5" fill="#E75603" style={{animation:"svLed 1.6s ease-in-out infinite"}}/>
    <path d="M198 88 h-8" stroke="rgba(223,231,247,.25)"/>
    <rect x="252" y="70" width="76" height="40" rx="9" fill="rgba(10,17,30,.85)" stroke="rgba(223,231,247,.25)"/>
    {[0,1,2,3,4].map(i=>(<rect key={i} x={264+i*12} y={92} width="6" height="10" rx="2" fill="#a7b6dc"
      style={{transformBox:"fill-box",transformOrigin:"50% 100%",animation:"svBars 1.3s ease-in-out "+(i*.18)+"s infinite"}}/>))}
  </Schematic>);}
function HeatingArt(){return(
  <Schematic>
    <Pipe d="M40 190 H320" w={10} dash/>
    <rect x="70" y="104" width="150" height="8" rx="4" className="met"/>
    <rect x="70" y="176" width="150" height="8" rx="4" className="met"/>
    {[0,1,2,3,4,5].map(i=><rect key={i} x={76+i*24} y="100" width="14" height="84" rx="7" className="met"/>)}
    <path d="M92 184 V190 M198 184 V190" stroke="rgba(223,231,247,.25)" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="230" cy="108" r="9" className="cop-st" strokeWidth="3"/>
    <circle cx="230" cy="108" r="2.6" className="cop"/>
    <Pipe d="M239 108 H268 V190" w={8} dash/>
    {[0,1,2,3].map(i=>(<path key={i} d={"M"+(88+i*32)+" 86 q5 7 0 14 q-5 7 0 13"} fill="none" stroke="rgba(167,182,220,.4)" strokeWidth="2" strokeLinecap="round"
      style={{transformBox:"fill-box",transformOrigin:"center",animation:"svHeat 2.2s ease-in-out "+(i*.35)+"s infinite"}}/>))}
    <circle cx="306" cy="84" r="26" fill="rgba(10,17,30,.85)" stroke="rgba(223,231,247,.3)"/>
    {[-50,0,50].map(a=>{const rad=a*Math.PI/180,s=Math.sin(rad),c=Math.cos(rad);
      return <line key={a} x1={306+s*18} y1={84-c*18} x2={306+s*23} y2={84-c*23} stroke="rgba(223,231,247,.35)" strokeWidth="1.5"/>;})}
    <rect x="304.8" y="64" width="2.4" height="20" rx="1.2" fill="#a7b6dc" style={{transformBox:"fill-box",transformOrigin:"50% 100%",animation:"svNeedle 4.5s ease-in-out infinite"}}/>
    <circle cx="306" cy="84" r="3" className="cop"/>
    <path d="M306 110 V132" stroke="rgba(223,231,247,.2)"/>
  </Schematic>);}
function DrainArt(){return(
  <Schematic>
    <path d="M84 44 V120 A56 56 0 0 0 196 120 V44" stroke="rgba(223,231,247,.25)" strokeWidth="34" fill="none"/>
    <path d="M84 44 V120 A56 56 0 0 0 196 120 V44" stroke="#101a30" strokeWidth="26" fill="none"/>
    <path d="M84 44 V120 A56 56 0 0 0 196 120 V44" stroke="rgba(167,182,220,.28)" strokeWidth="14" fill="none" strokeDasharray="10 12" style={{animation:"svDash 1.3s linear infinite"}}/>
    <circle cx="84" cy="112" r="10" fill="none" stroke="#a7b6dc" strokeWidth="2" style={{transformBox:"fill-box",transformOrigin:"center",animation:"svPulse 4.2s ease-out infinite"}}/>
    {[[138,162,"8deg"],[148,170,"-14deg"],[128,172,"22deg"],[142,176,"-6deg"],[152,164,"16deg"]].map((p,i)=>(
      <rect key={i} x={p[0]} y={p[1]} width="9" height="7" rx="2" fill="#E75603"
        style={{["--r"]:p[2],transformBox:"fill-box",transformOrigin:"center",animation:"svJig 4.2s cubic-bezier(.4,0,.4,1) "+(i*.16)+"s infinite"}}/>))}
    <g style={{transformBox:"fill-box",transformOrigin:"center",animation:"svPress 4.2s ease-in-out infinite"}}>
      <rect x="76" y="16" width="16" height="28" rx="7" className="cop"/>
      <path d="M62 44 a22 12 0 0 1 44 0 Z" className="cop"/>
    </g>
    <path d="M188 24 h18 m-6 -6 6 6 -6 6" fill="none" stroke="#a7b6dc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Schematic>);}

/* ============ services ============ */
const SERVICES=[
  {id:"plumbing",n:"01",icon:"droplet",title:"General Plumbing",short:"Leaks, taps, toilets, kitchens & bathrooms",
   desc:"We're fully licensed plumbers servicing both residential and commercial customers — everything from general plumbing repairs through to full kitchen and bathroom work.",
   tags:["Leaks & drips","Taps & mixers","Toilets","Renovations"],art:PlumbingArt},
  {id:"emergency",n:"02",icon:"zap",title:"Emergency Plumbing",short:"Rapid response, any hour of any day",
   desc:"Got a leak, no heating or no hot water at any time of day? No stress — our emergency plumbing service gets a qualified tech to your door in rapid time.",
   tags:["24/7 call-outs","Burst pipes","Major leaks"],art:EmergencyArt},
  {id:"gas",n:"03",icon:"flame",title:"Gas Engineering",short:"Gas fitting done by the book",
   desc:"Looking for a reliable gas engineer? We provide certified gas, boiler & central heating services — installed, tested and commissioned safely.",
   tags:["Gas fitting","Bayonets & cooktops","Leak detection"],art:GasArt},
  {id:"boiler",n:"04",icon:"gauge",title:"Boiler Installation",short:"All makes & models, serviced properly",
   desc:"We install and repair all boilers to a high-quality standard — servicing and repairs on every make and model, carried out by qualified professionals.",
   tags:["Installations","Servicing","Repairs"],art:BoilerArt},
  {id:"heating",n:"05",icon:"thermo",title:"Central Heating",short:"Radiator valves to full heating circuits",
   desc:"From changing a radiator valve to full boiler and heating-circuit installations — warm rooms, balanced flow, no cold spots.",
   tags:["Radiators","Heating circuits","Valves & thermostats"],art:HeatingArt},
  {id:"drains",n:"06",icon:"drain",title:"Blocked Drains",short:"Specialist gear, blockage gone",
   desc:"Drains blocked and nothing's working? Call our team — we'll be there with specialist equipment to find the blockage and clear it in no time.",
   tags:["CCTV locating","High-pressure jetting","Re-lining"],art:DrainArt},
];
function Stage({idx}){
  const Art=SERVICES[idx].art;
  return(<div className="stage glass">
    <div className="stage-tag"><Icon name="orbit" size={13}/>Live schematic — 0{idx+1}</div>
    <AnimatePresence mode="wait">
      <motion.div key={idx} className="stage-art"
        initial={{opacity:0,scale:.96,filter:"blur(6px)"}}
        animate={{opacity:1,scale:1,filter:"blur(0px)"}}
        exit={{opacity:0,scale:.98,filter:"blur(6px)"}}
        transition={{duration:.4,ease:[0.22,1,0.36,1]}}>
        <Art/>
      </motion.div>
    </AnimatePresence>
    <div className="stage-cap">
      <span className="stage-n">0{idx+1}</span>
      <div><strong>{SERVICES[idx].title}</strong><em>{SERVICES[idx].short}</em></div>
    </div>
  </div>);
}
function Services(){
  const [pinned,setPinned]=useState(0);
  const [open,setOpen]=useState(0);
  const [hover,setHover]=useState(null);
  const hoverRef=useRef(null);
  useEffect(()=>{hoverRef.current=hover;},[hover]);
  useEffect(()=>{const id=setInterval(()=>{if(hoverRef.current===null)setPinned(p=>(p+1)%SERVICES.length);},6200);return()=>clearInterval(id);},[]);
  const stageIdx=hover===null?pinned:hover;
  return(<section className="sec bt" id="services">
    <div className="wrap">
      <SectionHead kicker="Main services"
        title={<>Six ways we keep your place <span className="aqt">flowing</span>.</>}
        sub="From a dripping tap to a full heating circuit — one fully licensed crew, honest quotes, and workmanship that's guaranteed."/>
      <div className="svc-wrap">
        <div className="svc-stage-col"><div className="svc-sticky"><Stage idx={stageIdx}/></div></div>
        <div className="svc-list">
          {SERVICES.map((s,i)=>{
            const isOpen=open===i,isActive=stageIdx===i;
            return(<div key={s.id} className={"svc"+(isOpen?" open":"")+(isActive?" active":"")}
              onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}>
              <button className="svc-btn" onClick={()=>{setPinned(i);setOpen(isOpen?-1:i);}} aria-expanded={isOpen}>
                <span className="svc-n">{s.n}</span>
                <span className="svc-ic"><Icon name={s.icon} size={19}/></span>
                <span className="svc-t"><strong>{s.title}</strong><em>{s.short}</em></span>
                <motion.span className="svc-x" animate={{rotate:isOpen?45:0}} transition={{duration:.3}}><Icon name="plus" size={17}/></motion.span>
              </button>
              <AnimatePresence initial={false}>{isOpen&&(
                <motion.div key="body" className="svc-body" initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.38,ease:[0.22,1,0.36,1]}}>
                  <div className="svc-inner">
                    <p>{s.desc}</p>
                    <div className="svc-tags">{s.tags.map(t=><span className="pill" key={t}>{t}</span>)}</div>
                    <a className="svc-call" href={PHONE_HREF}><Icon name="phone" size={14}/>Call about {s.title.toLowerCase()}</a>
                  </div>
                </motion.div>)}
              </AnimatePresence>
            </div>);})}
        </div>
      </div>
    </div>
  </section>);
}

/* ============ process ============ */
const STEPS=[
  {n:"01",icon:"phone",t:"You call",d:"Tell us what's blocked, burst or cold — we'll give you a straight answer and a fair quote."},
  {n:"02",icon:"wrench",t:"We come to you",d:"A licensed tech arrives in the window we promise, with the right gear already on the van."},
  {n:"03",icon:"check",t:"Fixed & tidy",d:"Tested, cleaned up and guaranteed — we don't consider the job done until it is."},
];
function Process(){
  return(<section className="proc-sec bt">
    <div className="wrap">
      <SectionHead kicker="How it works" title="From your call to a fix — no runaround."/>
      <div className="proc">
        <div className="proc-line" aria-hidden="true"/>
        {STEPS.map((s,i)=>(
          <Reveal key={s.n} delay={i*.12} className="proc-item">
            <span className="proc-ic"><Icon name={s.icon} size={26}/><span className="proc-n">{s.n}</span></span>
            <h3>{s.t}</h3><p>{s.d}</p>
          </Reveal>))}
      </div>
    </div>
  </section>);
}

/* ============ projects ============ */
const PROJECTS=[
  {seed:"amaplumber-hotwater",cls:"p-a",tag:"Hot water",title:"50L electric swap-over",loc:"Joondalup"},
  {seed:"amaplumber-drain",cls:"p-w",tag:"Drainage",title:"Blocked main cleared & CCTV'd",loc:"Wanneroo"},
  {seed:"amaplumber-gas",cls:"p-s",tag:"Gas",title:"Bayonet heater point",loc:"Currambine"},
  {seed:"amaplumber-emergency",cls:"p-s",tag:"Emergency",title:"Burst pipe, 5:40am call-out",loc:"Ocean Reef"},
  {seed:"amaplumber-bathroom",cls:"p-w",tag:"Bathroom",title:"Full re-plumb & fit-off",loc:"Hillarys"},
  {seed:"amaplumber-kitchen",cls:"p-s",tag:"Kitchen",title:"Mixer & filter install",loc:"Beldon"},
];
function Projects(){
  return(<section className="sec bt" id="projects">
    <div className="wrap">
      <SectionHead kicker="Recent work" title="Straight from the van."
        sub="A snapshot of jobs around the northern suburbs — big, small and everything in between."/>
      <div className="proj-grid">
        {PROJECTS.map((p,i)=>{
          const dim=p.cls==="p-a"?"900/900":p.cls==="p-w"?"900/460":"500/500";
          return(<Reveal key={p.seed} delay={i*.06} className={"proj "+p.cls}>
            <img src={"https://picsum.photos/seed/"+p.seed+"/"+dim+".jpg"} alt={p.title} loading="lazy"/>
            <span className="proj-tag">{p.tag}</span>
            <div className="proj-cap">
              <div><strong>{p.title}</strong><em>{p.loc}</em></div>
              <Icon name="upRight" size={17}/>
            </div>
          </Reveal>);})}
      </div>
    </div>
  </section>);
}

/* ============ testimonials ============ */
const TST=[
  {q:"Had a burst pipe at 6am. They had the water off and it fixed before the school run — unreal response time.",n:"Sarah M.",s:"Joondalup",tag:"Burst pipe · Emergency",w:400},
  {q:"Two other crews couldn't clear our drain. AmaPlumber turned up with the right gear and had it flowing again within the hour.",n:"Dave R.",s:"Wanneroo",tag:"Blocked drains",w:430},
  {q:"New hot water system installed the same day we called. Everything explained upfront, and no surprises on the invoice.",n:"Priya K.",s:"Currambine",tag:"Hot water system",w:390},
  {q:"Certified gas work, neat as anything. Booking was dead easy and they actually arrived when they said they would.",n:"Tom & Elle H.",s:"Hillarys",tag:"Gas fitting",w:410},
  {q:"They look after all the plumbing at our café now. Reliable on every single visit — that's worth a lot to a small business.",n:"Marco B.",s:"Ocean Reef",tag:"Commercial plumbing",w:390},
];
function Testimonials(){
  const x=useMotionValue(0);
  const viewRef=useRef(),trackRef=useRef();
  const [minX,setMinX]=useState(0);
  const [prog,setProg]=useState(0);
  useEffect(()=>{
    const calc=()=>{const v=viewRef.current,t=trackRef.current;if(v&&t)setMinX(Math.min(0,v.clientWidth-t.scrollWidth));};
    const t1=setTimeout(calc,400);
    calc();window.addEventListener("resize",calc);
    return()=>{clearTimeout(t1);window.removeEventListener("resize",calc);};
  },[]);
  useMotionValueEvent(x,"change",v=>{setProg(minX<0?clampN(v/minX,0,1):0);});
  const active=Math.round(prog*(TST.length-1));
  const step=()=>{const el=trackRef.current&&trackRef.current.children[0];return el?el.offsetWidth+22:420;};
  const goIdx=i=>{
    i=clampN(i,0,TST.length-1);
    const target=(i===TST.length-1)?minX:clampN(-i*step(),minX,0);
    animate(x,target,{type:"spring",stiffness:300,damping:32});
  };
  return(<section className="sec bt" id="testimonials">
    <div className="wrap">
      <div className="tst-top">
        <SectionHead kicker="Testimonials" title="What our clients say…"
          sub="Real words from real locals — the sort of feedback a family business runs on."/>
        <Reveal className="tst-score glass" delay={.1}>
          <span className="ts-num">5.0</span>
          <span className="ts-right">
            <span className="ts-stars"><Stars size={15}/></span>
            <span>Rated by clients across Perth's north</span>
          </span>
        </Reveal>
      </div>
      <div className="tst-view" ref={viewRef} tabIndex={0} role="group" aria-label="Client testimonials — use arrow keys to browse"
        onKeyDown={e=>{if(e.key==="ArrowLeft")goIdx(active-1);if(e.key==="ArrowRight")goIdx(active+1);}}>
        <motion.div className="tst-track" ref={trackRef} style={{x}} drag="x"
          dragConstraints={{left:minX,right:0}} dragElastic={.06} whileTap={{cursor:"grabbing"}}>
          {TST.map((t,i)=>(
            <motion.article key={i} className="tcard glass" style={{width:"min("+t.w+"px, 84vw)"}}
              initial={{rotate:i%2?1.6:-1.6,opacity:0,y:26}}
              whileInView={{rotate:i%2?1.6:-1.6,opacity:1,y:0}}
              viewport={{once:true,margin:"-40px"}}
              whileHover={{rotate:0,y:-8}}
              transition={{type:"spring",stiffness:220,damping:22}}>
              <div className="tc-top"><span className="tc-tag"><i/>{t.tag}</span></div>
              <div className="tstars"><Stars size={14}/></div>
              <blockquote>“{t.q}”</blockquote>
              <footer>
                <span className={"tava"+(i%2?" o":"")}>{t.n[0]}</span>
                <div><strong>{t.n}</strong><em>{t.s}</em></div>
              </footer>
            </motion.article>))}
        </motion.div>
      </div>
      <div className="tst-nav">
        <button onClick={()=>goIdx(active-1)} aria-label="Previous review"><Icon name="chevL" size={19}/></button>
        <button onClick={()=>goIdx(active+1)} aria-label="Next review"><Icon name="chevR" size={19}/></button>
        <span className="tst-dots">
          {TST.map((_,i)=>(<button key={i} className={"tdot"+(i===active?" on":"")} onClick={()=>goIdx(i)} aria-label={"Go to review "+(i+1)}/>))}
        </span>
        <a className="tst-cta" href="#contact" onClick={e=>{e.preventDefault();scrollToSection("#contact");}}>Had a job done by us? Share your experience<Icon name="arrow" size={15}/></a>
      </div>
    </div>
  </section>);
}

/* ============ areas ============ */
function Areas(){
  return(<section className="sec bt" id="areas">
    <div className="wrap">
      <SectionHead kicker="Service area" title="Proudly covering Perth's north — and beyond."
        sub="Based in Beldon and on the road every day, from Joondalup to Wanneroo and everywhere in between."/>
      <Reveal delay={.08}>
        <div className="chips">{SUBURBS.map(s=><span className="chip" key={s}>{s}</span>)}</div>
        <p className="areas-note">Not on the list? <a href={PHONE_HREF}>Give us a call</a> — if we can't help, we'll point you to someone who can.</p>
      </Reveal>
    </div>
  </section>);
}

/* ============ contact ============ */
function Contact({showToast}){
  const [f,setF]=useState({name:"",phone:"",suburb:"",service:"",msg:""});
  const [err,setErr]=useState({});
  const [now,setNow]=useState("");
  useEffect(()=>{
    const u=()=>{try{setNow(new Intl.DateTimeFormat("en-AU",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Australia/Perth"}).format(new Date()));}catch(e){setNow("");}};
    u();const id=setInterval(u,15000);return()=>clearInterval(id);
  },[]);
  const set=k=>e=>{setF({...f,[k]:e.target.value});if(err[k])setErr({...err,[k]:false});};
  const submit=e=>{
    e.preventDefault();
    const er={name:f.name.trim().length<2,phone:!/^[0-9+()\- ]{8,}$/.test(f.phone),msg:f.msg.trim().length<5};
    setErr(er);
    if(er.name||er.phone||er.msg){showToast("Almost there — check the highlighted fields.","warn");return;}
    showToast("Thanks "+f.name.trim().split(" ")[0]+" — we've got your details and we'll ring you back shortly. The van's on standby 24/7.");
    setF({name:"",phone:"",suburb:"",service:"",msg:""});
  };
  return(<section className="sec bt" id="contact">
    <div className="wrap ct-grid">
      <div className="ct-l">
        <SectionHead kicker="Contact us" title="Tell us what's blocked, burst or cold."
          sub="Call for the fastest response — or drop your details here and we'll ring you back. Quotes are upfront and honest, every time."/>
          <Reveal className="ct-rows">
            <a className="ct-row glass" href={PHONE_HREF}>
              <span className="ct-ic"><Icon name="phone" size={18}/></span>
              <span><em>Call us — 24/7</em><strong>{PHONE}</strong></span>
              <Icon name="upRight" size={16} className="ct-arrow"/></a>
            <a className="ct-row glass" href={"mailto:"+EMAIL}>
              <span className="ct-ic"><Icon name="mail" size={18}/></span>
              <span><em>Email</em><strong>{EMAIL}</strong></span>
              <Icon name="upRight" size={16} className="ct-arrow"/></a>
            <div className="ct-row glass">
              <span className="ct-ic"><Icon name="pin" size={18}/></span>
              <span><em>Based in</em><strong>Beldon, Perth WA 6027</strong></span></div>
            <div className="ct-row glass">
              <span className="ct-ic"><Icon name="clock" size={18}/></span>
              <span><em>Opening hours</em><strong>Mon–Sun: Open 24 hours</strong></span>
              {now&&<span className="ct-live"><i className="dot"/>It's {now} in Perth — we're open</span>}
            </div>
          </Reveal>
      </div>
      <Reveal className="ct-form glass" delay={.05}>
        <form onSubmit={submit} noValidate>
          <h3>Request a call back</h3>
          <div className="f-grid">
            <label className={err.name?"bad":""}><span>Your name *</span>
              <input value={f.name} onChange={set("name")} placeholder="Jane Citizen"/></label>
            <label className={err.phone?"bad":""}><span>Phone *</span>
              <input value={f.phone} onChange={set("phone")} placeholder="0400 000 000" inputMode="tel"/></label>
            <label><span>Suburb</span>
              <input value={f.suburb} onChange={set("suburb")} placeholder="e.g. Joondalup"/></label>
            <label><span>What do you need?</span>
              <span className="sel">
                <select value={f.service} onChange={set("service")}>
                  <option value="">Choose a service…</option>
                  {SERVICES.map(s=><option key={s.id} value={s.title}>{s.title}</option>)}
                  <option>Something else</option>
                </select><Icon name="chevD" size={15}/></span></label>
            <label className={"full"+(err.msg?" bad":"")}><span>What's going on? *</span>
              <textarea rows="4" value={f.msg} onChange={set("msg")} placeholder="e.g. Hot water system stopped this morning, the tank's leaking from the base…"/></label>
          </div>
          <div className="f-foot">
            <button type="submit" className="btn btn-copper"><Icon name="send" size={16}/>Send request</button>
            <span className="f-note"><Icon name="shield" size={15}/>Upfront quote before we start. No surprises.</span>
          </div>
        </form>
      </Reveal>
    </div>
  </section>);
}

/* ============ about page ============ */
const AB_STATS=[
  {icon:"clock",t:"24/7, every day",d:"Open around the clock for plumbing & gas emergencies."},
  {icon:"home",t:"Family-run & local",d:"Beldon-based owners who stand behind every job."},
  {icon:"shield",t:"Licensed & by the book",d:"Fully licensed plumbers and certified gas work."},
  {icon:"pin",t:"Perth's north & beyond",d:"28 suburbs covered, from the coast to Wanneroo."},
];
const AB_VALUES=[
  {icon:"shield",t:"Honest, every time",d:"Straight answers and upfront quotes. If it doesn't need doing, we'll tell you."},
  {icon:"zap",t:"Quick & reliable",d:"We turn up when we say we will, with the right gear already on the van."},
  {icon:"eye",t:"An eye for detail",d:"From fit-off finishes to tidy sites — we treat the small things as the big things."},
  {icon:"home",t:"Friendly & local",d:"A family crew from Beldon who look after your place like it's our own."},
];
function About(){
  return(<div id="about-page">
    <section className="ab-hero">
      <div className="ab-glow"/>
      <div className="wrap ab-hero-in">
        <Rise className="eyebrow glass"><i className="dot"/>Family owned &amp; operated — Beldon, WA</Rise>
        <Rise delay={.08}><h1>The family crew behind <span className="org">AmaPlumber</span>.</h1></Rise>
        <Rise delay={.16}><p className="ab-lead">
          AmaPlumber Plumbing &amp; Gas is a <strong>family run business based north of Perth</strong>. We provide honest and reliable service — every time. Blocked drains, hot water, burst pipes and drainage, handled by people who genuinely care about doing it properly.
        </p></Rise>
        <div className="ab-stats">
          {AB_STATS.map((s,i)=>(
            <Rise key={s.t} delay={.24+i*.07} className="ab-stat glass">
              <Icon name={s.icon} size={24}/>
              <strong>{s.t}</strong><span>{s.d}</span>
            </Rise>))}
        </div>
      </div>
    </section>

    <section className="ab-sec">
      <div className="wrap">
        <Rise className="shead">
          <span className="kick"><FlowLine/>Our story</span>
          <h2>Built on word of mouth, one job at a time.</h2>
        </Rise>
        <div className="ab-grid">
          <Rise className="ab-story" delay={.05}>
            <p>It starts with a simple standard: <strong>treat every home like it's your own</strong>. That's how a family crew from Perth's northern suburbs has built its name — not on big promises, but on turning up, doing the work properly, and leaving things better than we found them.</p>
            <p>Our services include <strong>blocked drains, hot water installation, burst pipes and drainage</strong>. We perform our tasks to the best of our ability on every single job, whether it's a dripping tap in Beldon or a full hot-water swap in Joondalup.</p>
            <p>We're known for being <strong>quick, friendly and reliable</strong>, with an incredible focus on our clients' requirements and an eye for details. We're available <strong>24/7</strong> for all your plumbing needs — so please don't hesitate to give us a call.</p>
            {/* Add verified extras here when available: owner names, years in trade, plumbing licence no., ABN, gas licence no. */}
            <p className="ab-note">Fully licensed for plumbing and gasfitting work across Western Australia.</p>
          </Rise>
          <Rise delay={.12}>
            <div className="glance glass">
              <h3>At a glance</h3>
              <div className="gl-row">
                <span className="gl-ic"><Icon name="pin" size={17}/></span>
                <span><em>Based in</em><strong>Beldon, Perth WA 6027</strong></span>
              </div>
              <div className="gl-row">
                <span className="gl-ic"><Icon name="clock" size={17}/></span>
                <span><em>Hours</em><strong>Open 24 hours, 7 days</strong></span>
              </div>
              <a className="gl-row" href={PHONE_HREF}>
                <span className="gl-ic"><Icon name="phone" size={17}/></span>
                <span><em>Call us</em><strong>{PHONE}</strong></span>
              </a>
              <a className="gl-row" href={"mailto:"+EMAIL}>
                <span className="gl-ic"><Icon name="mail" size={17}/></span>
                <span><em>Email</em><strong>{EMAIL}</strong></span>
              </a>
              <a className="gl-row" href="#areas" onClick={e=>{e.preventDefault();scrollToSection("#areas");}}>
                <span className="gl-ic"><Icon name="orbit" size={17}/></span>
                <span><em>Servicing</em><strong>28 northern suburbs — and beyond</strong></span>
              </a>
            </div>
          </Rise>
        </div>
      </div>
    </section>

    <section className="ab-sec">
      <div className="wrap">
        <Rise className="shead">
          <span className="kick"><FlowLine/>What we stand for</span>
          <h2>Four things you can count on.</h2>
          <p>Plumbing is a trust trade — you're letting someone into your home. These are the standards we hold ourselves to on every call-out.</p>
        </Rise>
        <div className="ab-vals">
          {AB_VALUES.map((v,i)=>(
            <Rise key={v.t} delay={i*.07} className="ab-val glass">
              <span className="ab-vic"><Icon name={v.icon} size={21}/></span>
              <h3>{v.t}</h3><p>{v.d}</p>
            </Rise>))}
        </div>
      </div>
    </section>

    <section className="ab-sec">
      <div className="wrap">
        <Rise>
          <div className="ab-promise glass">
            <h3>“Honest and reliable service — <span className="org">every time</span>.”</h3>
            <p>That's not a slogan we borrowed — it is how this business has been run from day one, and how our clients across Perth's north know us.</p>
          </div>
        </Rise>
      </div>
    </section>

    <section className="ab-sec" id="ab-areas">
      <div className="wrap">
        <Rise className="shead">
          <span className="kick"><FlowLine/>Service area</span>
          <h2>Local to Perth's north — and beyond.</h2>
          <p>Based in Beldon and on the road every day. If you're nearby and need a hand, we're the crew to call.</p>
        </Rise>
        <Rise delay={.08}>
          <div className="chips">{SUBURBS.map(s=><span className="chip" key={s}>{s}</span>)}</div>
        </Rise>
      </div>
    </section>

    <section className="ab-sec">
      <div className="wrap">
        <Rise>
          <div className="ab-cta glass">
            <h2>Talk to a real plumber — day or night.</h2>
            <p>No call centres, no ticket numbers. When you ring AmaPlumber, you get the family crew that'll actually do the work.</p>
            <div className="ab-cta-btns">
              <a className="btn btn-copper" href={PHONE_HREF}><Icon name="phone" size={17}/>Call {PHONE}</a>
              <a className="btn btn-ghost" href={"mailto:"+EMAIL}><Icon name="mail" size={16}/>Email us</a>
            </div>
            <small>Open 24 hours, 7 days — Beldon, Perth WA</small>
          </div>
        </Rise>
      </div>
    </section>
  </div>);
}

/* ============ footer ============ */
function Footer({go}){
  const [more,setMore]=useState(false);
  const navClick=(fn)=>(e)=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button===1)return;
    e.preventDefault(); fn();
  };
  return(<footer className="foot">
    <div className="wrap foot-in">
      <div className="foot-brand">
        <a href="#home" className="brand" aria-label="AmaPlumber Plumbing & Gas — home" onClick={navClick(()=>go.home())}><Logo h={112}/></a>
        <p className="foot-blurb">AmaPlumber Plumbing &amp; Gas is a family run business based north of Perth. We provide honest and reliable service every time.
          <AnimatePresence initial={false}>{more&&(
            <motion.span style={{display:"block",overflow:"hidden"}} initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.35}}>
              Our services include blocked drains, hot water installation, burst pipes and drainage. We perform our tasks to the best of our ability — quick, friendly and reliable, with an incredible focus on our clients' requirements and an eye for detail.
            </motion.span>)}
          </AnimatePresence><br/>
          <button className="more" onClick={()=>setMore(m=>!m)}>{more?"Read less":"Read more"}<Icon name="chevD" size={14} className={more?"flip":""}/></button>
        </p>
      </div>
      <div className="foot-col"><h4>Useful links</h4>
        {NAV.map(l=><a key={l.label} href={l.href} onClick={navClick(()=>l.go?go[l.go]():go.section(l.section))}>{l.label}</a>)}</div>
      <div className="foot-col"><h4>Services</h4>
        {SERVICES.map(s=><a key={s.id} href="#services" onClick={navClick(()=>go.section("#services"))}>{s.title}</a>)}</div>
      <div className="foot-col"><h4>Contact details</h4>
        <span className="frow"><Icon name="pin" size={15}/>Beldon, Perth, WA 6027</span>
        <a className="frow" href={PHONE_HREF}><Icon name="phone" size={15}/>{PHONE}</a>
        <a className="frow" href={"mailto:"+EMAIL}><Icon name="mail" size={15}/>{EMAIL}</a>
        <span className="frow"><Icon name="clock" size={15}/>Mon–Sun: Open 24 hours</span>
      </div>
    </div>
    <div className="wrap foot-bar">
      <span>© {new Date().getFullYear()} AmaPlumber Plumbing &amp; Gas — Beldon, Perth WA</span>
      <span className="foot-flow"><FlowLine/>Open 24 hours, 7 days</span>
    </div>
  </footer>);
}

/* ============ scroll rail + toast ============ */
function ScrollRail(){
  const {scrollYProgress}=useScroll();
  const p=useSpring(scrollYProgress,{stiffness:140,damping:26,mass:.4});
  const h=useTransform(p,v=>(v*100).toFixed(2)+"%");
  return(<div className="rail" aria-hidden="true">
    <span className="rail-cap">FLOW</span>
    <div className="rail-track">
      <motion.div className="rail-fill" style={{height:h}}/>
      <motion.div className="rail-knob glass" style={{bottom:h}}><Icon name="droplet" size={12}/></motion.div>
    </div>
  </div>);
}
function Toast({toast}){
  return(<div className="toast-wrap">
    <motion.div className={"toast glass "+toast.type}
      initial={{y:26,opacity:0,scale:.95}} animate={{y:0,opacity:1,scale:1}} exit={{y:26,opacity:0,scale:.95}}
      transition={{type:"spring",stiffness:320,damping:26}}>
      <span className="toast-ic"><Icon name={toast.type==="ok"?"check":"alert"} size={15}/></span>
      <p>{toast.msg}</p>
    </motion.div>
  </div>);
}

/* ============ error boundary ============ */
class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={err:false};}
  static getDerivedStateFromError(){return{err:true};}
  componentDidCatch(error){console.error("[AmaPlumber] render error:",error);}
  render(){
    if(this.state.err){
      return(<div style={{minHeight:"72vh",display:"grid",placeContent:"center",justifyItems:"center",gap:"14px",padding:"140px 24px 60px",textAlign:"center"}}>
        <Icon name="wrench" size={36}/>
        <h2 style={{fontSize:"1.7rem"}}>Something's blocked up on our end.</h2>
        <p style={{color:"var(--mut)",maxWidth:"440px"}}>This section failed to load — but we're still on call. Try refreshing the page, or ring us anytime.</p>
        <a className="btn btn-copper" href={PHONE_HREF}><Icon name="phone" size={16}/>Call {PHONE}</a>
      </div>);
    }
    return this.props.children;
  }
}

/* ============ home page ============ */
function HomePage({showToast,active}){
  return(<>
    <Hero active={active}/>
    <EmergencyBand/>
    <Services/>
    <Process/>
    <Projects/>
    <Testimonials/>
    <Areas/>
    <Contact showToast={showToast}/>
  </>);
}

/* ============ app ============ */
function App(){
  const [route,setRoute]=useState(getRoute);
  const [toast,setToast]=useState(null);
  const tRef=useRef();
  const routeRef=useRef(route); routeRef.current=route;
  const showToast=(msg,type="ok")=>{clearTimeout(tRef.current);setToast({msg,type,id:Date.now()});};

  /* navigation actions: each one applies the route DIRECTLY to the DOM
     first (guaranteed), then syncs React state for title/active-link */
  const applyRoute=(r)=>{
    console.info("[AmaPlumber] route:",r);
    applyRouteToDOM(r);          /* ← the page switch itself: pure DOM */
    setRoute(prev=>prev===r?prev:r);
  };
  const go={
    home:()=>{
      setHashSafe("#home");
      applyRoute("home");
      setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),60);
    },
    about:()=>{
      setHashSafe("#/about");
      applyRoute("about");
      window.scrollTo(0,0);
    },
    section:(id)=>{
      const jump=()=>scrollToSection(id);
      if(routeRef.current!=="home"){
        setHashSafe(id);
        applyRoute("home");      /* un-hides home immediately */
        setTimeout(jump,140);    /* then scroll once it's visible */
      }else{
        setHashSafe(id);
        jump();
      }
    },
  };

  useEffect(()=>{
    window.__amaMounted=true;
    console.info("[AmaPlumber] app ready — route:",getRoute());
    applyRouteToDOM(getRoute());
    const onHash=()=>{
      const r=getRoute();
      console.info("[AmaPlumber] hashchange →",r);
      applyRoute(r);
    };
    window.addEventListener("hashchange",onHash);
    return()=>window.removeEventListener("hashchange",onHash);
  },[]);
  useEffect(()=>{if(toast){tRef.current=setTimeout(()=>setToast(null),4800);}},[toast]);
  useEffect(()=>{
    document.title=route==="about"
      ?"About Us — AmaPlumber Plumbing & Gas | Family Plumbers, Perth's North"
      :"AmaPlumber Plumbing & Gas — 24/7 Plumbers & Gas Fitters, Perth's North";
  },[route]);

  return(<>
    <ScrollRail/>
    <Header route={route} go={go}/>
    <main>
      <ErrorBoundary>
        {/* BOTH pages are always in the HTML. `hidden` is a plain attribute —
            no mounting, no unmounting, nothing that can fail to appear. */}
        <div className="pg" id="pg-home" hidden={route!=="home"}>
          <HomePage showToast={showToast} active={route==="home"}/>
        </div>
        <div className="pg" id="pg-about" hidden={route!=="about"}>
          <About/>
        </div>
      </ErrorBoundary>
    </main>
    <Footer go={go}/>
    <AnimatePresence>{toast&&<Toast key={toast.id} toast={toast}/>}</AnimatePresence>
  </>);
}
createRoot(document.getElementById("root")).render(<App/>);