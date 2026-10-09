import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import './tryon.css';
import {SIZE_CHART, estimateFit} from './fitCalculator.js';

const COLORS = [
  { label: 'Onyx', hex: '#272b30' },
  { label: 'Sand', hex: '#cbbca8' },
  { label: 'Sage', hex: '#697c6d' },
  { label: 'Bordeaux', hex: '#753b47' },
];
const SHAPES = [
  { id: 'slim', label: 'Slim', chest: 86, torso: .92 },
  { id: 'regular', label: 'Regular', chest: 98, torso: 1 },
  { id: 'athletic', label: 'Athletic', chest: 110, torso: 1.09 },
];
const defaultProduct = { name: 'Essential Sculpt Tee', slug: 'essential-sculpt-tee', brand_name: 'ATELIER NORTH', price: 1450000, variants: Object.keys(SIZE_CHART).map(size => ({size, color: 'Onyx', chest_cm: SIZE_CHART[size], stock: 8})) };
const money = n => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

function Cylinder({a,b,r1,r2,color,metalness=0,roughness=.74}) {
  const center=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  const axis=useMemo(()=>{
    // Axis rotation of a Y-oriented cylinder. Arms/legs use fixed geometry segments.
    const dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2];
    return [0,0,-Math.atan2(dx,dy)];
  },[a[0],a[1],a[2],b[0],b[1],b[2]]);
  return <mesh position={center} rotation={axis} castShadow receiveShadow>
    <cylinderGeometry args={[r1,r2,length,28]}/>
    <meshStandardMaterial color={color} roughness={roughness} metalness={metalness}/>
  </mesh>;
}

function Mannequin({ chest, height, frame, garmentChest, garmentColor, sleeves=true }) {
  const body=chest/98;
  const scale=height/173;
  const torso=frame === 'athletic' ? 1.07 : frame === 'slim' ? .93 : 1;
  const skin='#dad4cb', hardware='#9c9b93';
  const shirt=garmentChest/106;
  const tight=garmentChest-chest<5;
  return <group scale={[scale,scale,scale]} position={[0,-1.35*scale,0]}>
    <mesh receiveShadow position={[0,-.13,0]}><cylinderGeometry args={[.58,.63,.07,48]}/><meshStandardMaterial color="#e7e2da" metalness={.25} roughness={.65}/></mesh>
    <Cylinder a={[-.19,.02,0]} b={[-.23,1.04,0]} r1={.142*body} r2={.11*body} color={skin}/>
    <Cylinder a={[.19,.02,0]} b={[.23,1.04,0]} r1={.142*body} r2={.11*body} color={skin}/>
    <mesh position={[-.21,.015,.13]} castShadow><boxGeometry args={[.37,.14,.58]}/><meshStandardMaterial color={skin}/></mesh>
    <mesh position={[.21,.015,.13]} castShadow><boxGeometry args={[.37,.14,.58]}/><meshStandardMaterial color={skin}/></mesh>
    <mesh position={[0,1.12,0]} scale={[body*torso,.64,.58*body]} castShadow><sphereGeometry args={[.47,40,24]}/><meshStandardMaterial color={skin} roughness={.8}/></mesh>
    <mesh position={[0,1.75,0]} scale={[body*torso,1,.65*body]} castShadow><sphereGeometry args={[.48,40,24]}/><meshStandardMaterial color={skin} roughness={.8}/></mesh>
    <Cylinder a={[-.43*body*torso,2.1,0]} b={[-.69*body,1.37,0]} r1={.143*body} r2={.10*body} color={skin}/>
    <Cylinder a={[.43*body*torso,2.1,0]} b={[.69*body,1.37,0]} r1={.143*body} r2={.10*body} color={skin}/>
    <Cylinder a={[-.69*body,1.37,0]} b={[-.67*body,.96,0]} r1={.105*body} r2={.085*body} color={skin}/>
    <Cylinder a={[.69*body,1.37,0]} b={[.67*body,.96,0]} r1={.105*body} r2={.085*body} color={skin}/>
    <Cylinder a={[0,2.17,0]} b={[0,2.43,0]} r1={.135} r2={.128} color={hardware} metalness={.4}/>
    <mesh position={[0,2.69,0]} castShadow><sphereGeometry args={[.27,48,32]}/><meshStandardMaterial color={skin} roughness={.75}/></mesh>
    <mesh position={[0,2.97,0]}><sphereGeometry args={[.12,24,16]}/><meshStandardMaterial color={hardware} metalness={.55} roughness={.26}/></mesh>
    {/* Shirt geometry is a VISUAL PROXY, not a simulated sewn garment. */}
    <mesh position={[0,1.81,.014]} castShadow receiveShadow>
      <cylinderGeometry args={[.475*shirt,.445*shirt,.9,48,1]}/>
      <meshStandardMaterial color={garmentColor} roughness={tight?.55:.84} metalness={tight?.08:0} />
    </mesh>
    {sleeves && <>
      <Cylinder a={[-.455*shirt,2.18,.005]} b={[-.61*shirt,1.80,.005]} r1={.198*shirt} r2={.17*shirt} color={garmentColor}/>
      <Cylinder a={[.455*shirt,2.18,.005]} b={[.61*shirt,1.80,.005]} r1={.198*shirt} r2={.17*shirt} color={garmentColor}/>
    </>}
    <mesh position={[0,2.276,.018]} rotation={[Math.PI/2,0,0]}>
      <torusGeometry args={[.142*shirt,.018,10,40]}/><meshStandardMaterial color="#9f9c91" roughness={.8}/>
    </mesh>
    <mesh position={[0,1.74,.45*shirt+.018]}>
      <boxGeometry args={[.095,.018,.006]}/><meshStandardMaterial color="#e3daca"/>
    </mesh>
  </group>;
}

function FittingScene({chest,height,frame,shirtChest,color}) {
  return <Canvas shadows camera={{position:[2.9,1.55,5.3], fov:37}} dpr={[1,1.7]} gl={{antialias:true}}>
    <color attach="background" args={['#eeeae4']}/>
    <ambientLight intensity={1.55}/>
    <directionalLight position={[4,6,4]} intensity={2.6} castShadow shadow-mapSize={[1024,1024]}/>
    <directionalLight position={[-3,2,-4]} intensity={1.3} color="#c5cfdb"/>
    <Mannequin chest={chest} height={height} frame={frame} garmentChest={shirtChest} garmentColor={color}/>
    <ContactShadows position={[0,-1.7,0]} opacity={.22} scale={4} blur={2.4}/>
    <OrbitControls enablePan={false} minPolarAngle={.62} maxPolarAngle={2.09} minDistance={3.5} maxDistance={8.2} target={[0,.1,0]}/>
  </Canvas>;
}

function availableSize(product, size) {
  return (product.variants||[]).find(x => x.size === size);
}

export function TryOnStudio({ product=defaultProduct, storeUrl='http://localhost:5173', compact=false }) {
  const [frame,setFrame]=useState('regular');
  const [height,setHeight]=useState(173);
  const [chest,setChest]=useState(98);
  const [size,setSize]=useState('M');
  const [color,setColor]=useState(COLORS[0]);
  const productSizes=Array.from(new Set((product.variants||[]).map(v=>v.size))).filter(v=>SIZE_CHART[v]);
  const sizes=productSizes.length ? productSizes : Object.keys(SIZE_CHART);
  const chosenSize=sizes.includes(size)?size:sizes[0];
  const variant=availableSize(product,chosenSize);
  const garmentChest=Number(variant?.chest_cm) || SIZE_CHART[chosenSize] || SIZE_CHART.M;
  const fit=estimateFit(garmentChest,chest);
  const ease=fit.ease;
  const href=`${storeUrl.replace(/\/$/,'')}/product/${encodeURIComponent(product.slug||defaultProduct.slug)}?size=${encodeURIComponent(chosenSize)}`;
  return <section className={`kdtry-root ${compact?'kdtry-compact':''}`}>
    <div className="kdtry-heading">
      <div><div className="kdtry-eyebrow">KD STUDIO / EXPERIMENTAL FITTING</div><h2>Virtual Fitting <em>Room.</em></h2><p>Khám phá phom dáng trên mannequin 3D. Chọn vóc dáng, đổi size và xoay mô hình để quan sát.</p></div>
      <span className="kdtry-tag">3D PREVIEW · BETA</span>
    </div>
    <div className="kdtry-layout">
      <div className="kdtry-scene">
        <div className="kdtry-overlay"><span className="kdtry-dot"/> LIVE 3D MANNEQUIN <span className="kdtry-overlay-right">360° VIEW</span></div>
        <FittingScene chest={chest} height={height} frame={frame} shirtChest={garmentChest} color={color.hex}/>
        <div className="kdtry-bottom-overlay">Kéo để xoay · Cuộn để phóng to</div>
      </div>
      <div className="kdtry-settings">
        <div className="kdtry-count">01 / SELECT PRODUCT</div>
        <h3>{product.name||defaultProduct.name}</h3>
        <p className="kdtry-brand">{product.brand_name || product.brand?.name || 'KD DEMO COLLECTION'} — {money(product.price||defaultProduct.price)}</p>
        <div className="kdtry-divider"/>
        <div className="kdtry-count">02 / MANNEQUIN PROFILE</div>
        <label className="kdtry-label">Dáng người</label>
        <div className="kdtry-options">
          {SHAPES.map(x=><button key={x.id} className={frame===x.id?'selected':''} onClick={()=>{setFrame(x.id);setChest(x.chest)}}>{x.label}</button>)}
        </div>
        <label className="kdtry-label">Chiều cao <strong>{height} cm</strong></label>
        <input aria-label="Chiều cao mannequin" type="range" min="150" max="195" step="1" value={height} onChange={e=>setHeight(Number(e.target.value))}/>
        <label className="kdtry-label">Vòng ngực mannequin <strong>{chest} cm</strong></label>
        <input aria-label="Vòng ngực mannequin" type="range" min="78" max="122" step="1" value={chest} onChange={e=>setChest(Number(e.target.value))}/>
        <div className="kdtry-divider"/>
        <div className="kdtry-count">03 / GARMENT SELECTION</div>
        <label className="kdtry-label">Size áo <strong>{chosenSize}</strong></label>
        <div className="kdtry-options kdtry-sizes">
          {sizes.map(x=><button key={x} className={chosenSize===x?'selected':''} onClick={()=>setSize(x)}>{x}</button>)}
        </div>
        <label className="kdtry-label">Màu minh họa <strong>{color.label}</strong></label>
        <div className="kdtry-swatches">{COLORS.map(c=><button key={c.label} aria-label={c.label} title={c.label} onClick={()=>setColor(c)} className={color.label===c.label?'selected':''} style={{'--swatch':c.hex}}/>)}</div>
        <div className={`kdtry-fit kdtry-${fit.tone}`}><div><strong>{fit.label}</strong><small>Khoảng chênh vòng ngực: {ease>0?'+':''}{ease} cm</small></div><span>↗</span></div>
        <p className="kdtry-disclaimer">Phép tính minh họa từ thông số vòng ngực, không phải AI hoặc kết quả thử đồ thực tế. Độ vừa còn phụ thuộc vai, eo, chất liệu và form từng brand. Màu và hình áo trong mô phỏng không phải thiết kế sản phẩm chính hãng.</p>
        <a className="kdtry-cta" href={href}>Xem sản phẩm tại KD Store <span>↗</span></a>
      </div>
    </div>
  </section>;
}

export { defaultProduct, SIZE_CHART };
