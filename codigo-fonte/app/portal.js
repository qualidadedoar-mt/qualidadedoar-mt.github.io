// Portal QAR: dados, cálculo do IQAr no navegador, mapa e telas.
import { GEO } from "./geo.js";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(v,d=0)=>v==null||isNaN(v)?"–":v.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
const store={get(k,d){try{const v=localStorage.getItem("qar."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("qar."+k,JSON.stringify(v))}catch(e){}}};

/* ---------- IQAr (Conama 506/2024, orientação técnica MMA jan/2025) ---------- */
const LV=[null,
 {n:1,name:"Boa",c:"var(--n1)",lo:0,hi:40},
 {n:2,name:"Moderada",c:"var(--n2)",lo:41,hi:80},
 {n:3,name:"Ruim",c:"var(--n3)",lo:81,hi:120},
 {n:4,name:"Muito ruim",c:"var(--n4)",lo:121,hi:200},
 {n:5,name:"Péssima",c:"var(--n5)",lo:201,hi:400}];
const BP={ // limites superiores de concentração por faixa
 "MP2,5":{per:"24 h",u:"µg/m³",b:[15,50,75,125,300]},
 "MP10":{per:"24 h",u:"µg/m³",b:[45,100,150,250,600]},
 "O3":{per:"8 h",u:"µg/m³",b:[100,130,160,200,800]},
 "NO2":{per:"1 h",u:"µg/m³",b:[200,240,320,1130,3750]},
 "SO2":{per:"24 h",u:"µg/m³",b:[40,50,125,800,2620]},
 "CO":{per:"8 h",u:"ppm",b:[9,11,13,15,50]}};
const HEALTH=[null,
 "Sem riscos esperados à saúde.",
 "Pessoas de grupos sensíveis (crianças, idosos e pessoas com doenças respiratórias ou cardíacas) podem ter tosse seca e cansaço. A população em geral não é afetada.",
 "Toda a população pode ter tosse seca, cansaço e ardor nos olhos, nariz e garganta. Grupos sensíveis podem ter efeitos mais sérios.",
 "Toda a população pode ter sintomas mais intensos, como falta de ar e respiração ofegante. Grupos sensíveis podem ter efeitos ainda mais graves.",
 "Risco de manifestações sérias de doenças respiratórias e cardiovasculares e aumento de mortes prematuras em grupos sensíveis."];
function roundEven(x){const f=Math.floor(x),d=x-f;if(Math.abs(d-.5)<1e-9)return f%2===0?f:f+1;return Math.round(x)}
function iqar(pol,c){
  if(c==null||isNaN(c))return null;
  const b=BP[pol].b; c=pol==="CO"?Math.round(c*10)/10:roundEven(c);
  let lo=0;
  for(let i=0;i<5;i++){
    if(c<=b[i]){const L=LV[i+1];const ci=i===0?0:b[i-1];const ii=i===0?0:L.lo;return Math.round(ii+(L.hi-ii)/(b[i]-ci)*(c-ci))}
  }
  return 400;
}
const lvOf=i=>i==null?null:i<=40?1:i<=80?2:i<=120?3:i<=200?4:5;
const pill=(n,txt)=>`<span class="pill${n===2?" l2":""}" style="background:${LV[n].c}">${txt||("N"+n+" "+LV[n].name)}</span>`;

/* ---------- Geografia ---------- */
const [LON0,LON1,LAT0,LAT1,KX,SX]=GEO.b;
const proj=(lon,lat)=>[(lon-LON0)*KX*SX,(LAT1-lat)*SX];
const MUN=GEO.mun; const MUNBY={}; MUN.forEach(m=>MUNBY[m.n]=m);
const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

const REGION={"Cuiabá":"Baixada Cuiabana","Várzea Grande":"Baixada Cuiabana","Chapada dos Guimarães":"Baixada Cuiabana","Barão de Melgaço":"Pantanal","Poconé":"Pantanal","Cáceres":"Pantanal","Barra do Bugres":"Oeste","Tangará da Serra":"Oeste","Pontes e Lacerda":"Oeste","Campo Novo do Parecis":"Oeste","Primavera do Leste":"Sudeste","Rondonópolis":"Sudeste","Barra do Garças":"Araguaia","São Félix do Araguaia":"Araguaia","Guarantã do Norte":"Norte","Alta Floresta":"Norte","Sinop":"Médio-Norte","Sorriso":"Médio-Norte","Lucas do Rio Verde":"Médio-Norte","Nova Mutum":"Médio-Norte"};

/* ---------- Estações (posições aproximadas, ajustar com o cadastro real) ---------- */
// t: thermo | aqms | pa ; op: operador ; h: PM2.5 24h no cenário hoje ; f: no cenário queimadas
const DEMO_ST=[
 {id:"thermo-ufmt",t:"thermo",name:"UFMT · Física Ambiental",mun:"Cuiabá",lat:-15.609,lon:-56.066,op:"UFMT/PPGFA · Sema-MT",h:12.4,f:78},
 {id:"aqms06-centro",t:"aqms",name:"AQMS06 · Centro",mun:"Cuiabá",lat:-15.598,lon:-56.097,op:"UFMT/PPGFA · Sema-MT",h:14.8,f:84},
 {id:"pa-ufmt",t:"pa",name:"UFMT (colocalizado)",mun:"Cuiabá",lat:-15.6095,lon:-56.0655,op:"Sema-MT",h:12.9,f:80},
 {id:"pa-cpa",t:"pa",name:"CPA",mun:"Cuiabá",lat:-15.560,lon:-56.072,op:"Sema-MT",h:13.6,f:88},
 {id:"pa-coxipo",t:"pa",name:"Coxipó",mun:"Cuiabá",lat:-15.632,lon:-56.048,op:"Sema-MT",h:11.2,f:74},
 {id:"pa-pedra90",t:"pa",name:"Pedra 90",mun:"Cuiabá",lat:-15.668,lon:-56.020,op:"Comunidade",h:13.8,f:96},
 {id:"pa-vg-centro",t:"pa",name:"Centro",mun:"Várzea Grande",lat:-15.646,lon:-56.132,op:"Sema-MT",h:15.1,f:92},
 {id:"pa-vg-cristo",t:"pa",name:"Cristo Rei",mun:"Várzea Grande",lat:-15.628,lon:-56.150,op:"Sema-MT",h:13.9,f:86},
 {id:"pa-barao",t:"pa",name:"Centro",mun:"Barão de Melgaço",lat:-16.194,lon:-55.967,op:"Sema-MT",h:17.5,f:132},
 {id:"pa-pocone",t:"pa",name:"Centro",mun:"Poconé",lat:-16.257,lon:-56.623,op:"Sema-MT",h:19.2,f:146},
 {id:"pa-bbugres",t:"pa",name:"Centro",mun:"Barra do Bugres",lat:-15.073,lon:-57.181,op:"Sema-MT",h:9.8,f:64},
 {id:"pa-primavera",t:"pa",name:"Centro",mun:"Primavera do Leste",lat:-15.560,lon:-54.297,op:"Sema-MT",h:8.1,f:47},
 {id:"pa-pontes",t:"pa",name:"Centro",mun:"Pontes e Lacerda",lat:-15.226,lon:-59.335,op:"Sema-MT",h:12.2,f:98},
 {id:"pa-cnp",t:"pa",name:"Centro",mun:"Campo Novo do Parecis",lat:-13.658,lon:-57.890,op:"Sema-MT",h:7.4,f:61},
 {id:"pa-sfa",t:"pa",name:"Orla",mun:"São Félix do Araguaia",lat:-11.617,lon:-50.669,op:"Sema-MT",h:47.5,f:168},
 {id:"pa-roo",t:"pa",name:"Vila Aurora",mun:"Rondonópolis",lat:-16.470,lon:-54.636,op:"Sema-MT",h:10.6,f:56},
 {id:"pa-bga",t:"pa",name:"Centro",mun:"Barra do Garças",lat:-15.890,lon:-52.257,op:"Sema-MT",h:13.3,f:83},
 {id:"pa-gn",t:"pa",name:"Centro",mun:"Guarantã do Norte",lat:-9.962,lon:-54.910,op:"Sema-MT",h:29.6,f:118,off:true},
 {id:"pa-mutum",t:"pa",name:"Centro",mun:"Nova Mutum",lat:-13.830,lon:-56.081,op:"Sema-MT",h:8.6,f:58},
 {id:"pa-sinop",t:"pa",name:"Jardim Botânico",mun:"Sinop",lat:-11.864,lon:-55.509,op:"UFMT Sinop",h:13.5,f:77},
 {id:"pa-sorriso",t:"pa",name:"Centro",mun:"Sorriso",lat:-12.546,lon:-55.711,op:"Comunidade",h:11.9,f:66},
 {id:"pa-lucas",t:"pa",name:"Escola Estadual",mun:"Lucas do Rio Verde",lat:-13.050,lon:-55.911,op:"Comunidade",h:10.2,f:62},
 {id:"pa-tangara",t:"pa",name:"Centro",mun:"Tangará da Serra",lat:-14.622,lon:-57.494,op:"Comunidade",h:9.1,f:63},
 {id:"pa-caceres",t:"pa",name:"Cavalhada",mun:"Cáceres",lat:-16.071,lon:-57.679,op:"Comunidade",h:13.2,f:108},
 {id:"pa-af",t:"pa",name:"Centro",mun:"Alta Floresta",lat:-9.876,lon:-56.086,op:"Comunidade",h:24.3,f:124},
 {id:"pa-chapada",t:"pa",name:"Centro",mun:"Chapada dos Guimarães",lat:-15.461,lon:-55.750,op:"Comunidade",h:8.9,f:71}
];
let ST=DEMO_ST;
const TYPE={thermo:"Estação de referência Thermo Grid 5000",aqms:"Estação multiparâmetro AQMS06",pa:"Sensor PurpleAir"};

/* ---------- Simulação de dados ---------- */
function rng(seed){let a=0;for(const ch of seed)a=(a*31+ch.charCodeAt(0))|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const diurnal=h=>1+.32*Math.cos((h-6)/24*2*Math.PI)+.12*Math.cos((h-21)/12*2*Math.PI);
let SCN=store.get("scn","hoje");
const NOW=new Date(); NOW.setMinutes(0,0,0);
function refDate(){if(SCN==="hoje")return new Date(NOW);const d=new Date(NOW);d.setMonth(8,12);d.setFullYear(2026);return d}
let D={};
let MODE="demo", REAL=null;  // MODE: demo | real
function generate(){if(MODE==="real"&&REAL)buildReal();else generateDemo()}
function generateDemo(){
  ST=DEMO_ST;
  const fire=SCN==="fogo"; const now=refDate(); const H=now.getHours();
  D={now,stations:{},mun:{},fires:[],alerts:[],real:false};
  for(const s of ST){
    const r=rng(s.id+SCN); const base=fire?s.f:s.h;
    const ser=[]; // 48 h, último = agora
    for(let k=47;k>=0;k--){const h=(H-k+48)%24;const trend=fire?1+.0025*(24-k):1-.002*(24-k);ser.push(Math.max(1,base*diurnal(h)*trend*(0.86+0.28*r())))}
    const m24=ser.slice(24).reduce((a,b)=>a+b,0)/24; for(let i=0;i<48;i++)ser[i]*=base/m24;
    const o={s,ser,pm1h:ser[47],pm25:base,rh:fire?28+r()*10:72+r()*12};
    o.pm10=base*(fire?1.35:1.8)*(0.95+r()*.1);
    o.pol={"MP2,5":base,"MP10":o.pm10};
    if(s.t!=="pa"){
      o.pol.O3=fire?132+r()*20:70+r()*18; o.pol.NO2=fire?88+r()*20:52+r()*20; o.pol.CO=fire?2.6+r():0.5+r()*.3; o.pol.SO2=fire?11+r()*4:5+r()*3;
      if(s.t==="aqms")o.pol.TVOC=fire?410+r()*80:160+r()*40;
    }
    scoreStation(o);
    o.online=!s.off; o.lastSeenMin=s.off?540:Math.floor(r()*6)+1;
    o.ab=s.t==="pa"?(s.off?null:+(0.4+r()*2.2).toFixed(1)):null;
    o.comp=s.off?71:Math.round(94+r()*6); o.rep=true;
    D.stations[s.id]=o;
  }
  derive();
  // focos de calor (demonstração)
  const r=rng("fogos"+SCN); const nF=fire?420:46;
  const hot=fire?[[-57,-17,1.4],[-51.5,-11.5,1.8],[-55.5,-10,2],[-59.5,-11,1.8],[-53,-13,1.5],[-58,-15.5,1.2]]:[[-51.8,-11.2,1.2],[-54.6,-10.1,1],[-58.8,-10.2,1.3]];
  for(let i=0;i<nF;i++){const c=hot[Math.floor(r()*hot.length)];const lon=c[0]+(r()+r()-1)*c[2],lat=c[1]+(r()+r()-1)*c[2];if(lon>LON0&&lon<LON1&&lat>LAT0&&lat<LAT1)D.fires.push([lon,lat])}
  D.fireTotal=fire?3870:139;
  D.wind=fire?{dir:"nordeste",from:45,spd:14}:{dir:"norte",from:350,spd:9};
  levelAlerts();
  const mk=(lvl,mun,title,txt,when,active=true)=>D.alerts.push({lvl,mun,title,txt,when,active});
  if(!fire){
    mk(3,"São Félix do Araguaia","Atenção · previsão","Focos de calor no vale do Araguaia e vento fraco. Previsão de N3 Ruim entre 20h de hoje e 8h de amanhã.","emitido às 6h");
    mk(2,"Guarantã do Norte","Sensor fora do ar","Último dado válido há 9 horas. Valor do município estimado por interpolação até o retorno do sensor.","desde 1h");
    mk(3,"Poconé","Fim de episódio","O IQAr voltou à faixa Moderada após 14 horas em N3. Chuva de 18 mm dispersou a fumaça.","ontem 21h",false);
  } else {
    mk(4,"Mato Grosso","Previsão para amanhã","Modelo indica pluma de fumaça sobre Baixada Cuiabana e Pantanal, com IQAr entre N4 e N5 de madrugada.","emitido às 6h");
  }
}
function scoreStation(o){
  let best=null,dom=null;
  for(const p in o.pol){if(!BP[p]||o.pol[p]==null)continue;const v=iqar(p,o.pol[p]);if(best==null||v>best){best=v;dom=p}}
  o.iqar=best;o.lv=lvOf(best);o.dom=dom;
}
// Série horária (48 valores, null quando falta dado) a partir dos pontos do coletor
function hourly(sp,nowMs){
  const out=new Array(48).fill(null); if(!sp||!sp.t)return out;
  const sum=new Array(48).fill(0),n=new Array(48).fill(0),nowS=nowMs/1000;
  sp.t.forEach((t,i)=>{const v=sp.v[i];if(v==null)return;const k=47-Math.floor((nowS-t)/3600);if(k>=0&&k<48){sum[k]+=v;n[k]++}});
  for(let k=0;k<48;k++)if(n[k])out[k]=sum[k]/n[k];
  return out;
}
function buildReal(){
  const snap=REAL; const now=new Date(snap.atualizado);
  ST=(snap.estacoes||[]).filter(e=>e.lat!=null&&MUNBY[e.municipio]).map(e=>({id:e.id,t:e.tipo||"pa",name:e.nome,mun:e.municipio,lat:e.lat,lon:e.lon,op:e.operador||"",_e:e}));
  D={now,stations:{},mun:{},fires:[],alerts:[],real:true,fireTotal:null,wind:null};
  for(const s of ST){
    const e=s._e; const sp=e.serie&&e.serie["MP2,5"]; const ser=hourly(sp,now.getTime());
    const pol={};for(const p in (e.medias||{}))pol[p]=e.medias[p];
    const uv=e.ultimo_valor||{};
    const o={s,ser,pm1h:uv["MP2,5"]??null,pm25:pol["MP2,5"]??null,pm10:pol["MP10"]??null,rh:e.ur??null,pol};
    scoreStation(o);
    o.lastSeenMin=Math.max(0,Math.round((now-new Date(e.ultimo))/60000));
    o.online=!!e.online&&o.iqar!=null; s.off=!o.online;
    o.ab=e.ab??null; o.comp=e.completude==null?null:Math.round(e.completude*100); o.rep=e.representativo!==false; o.qc=e.qc||null;
    D.stations[s.id]=o;
  }
  derive(); levelAlerts();
  for(const s of ST){const o=D.stations[s.id];if(!o.online)D.alerts.push({lvl:2,mun:s.mun,title:"Equipamento sem dados",txt:`${s.name}: ${o.qc||"última leitura "+ago(o.lastSeenMin)}. O município usa estimativa por interpolação enquanto isso.`,when:ago(o.lastSeenMin),active:true})}
}
function derive(){
  // municípios monitorados: pior estação com dado válido
  for(const s of ST){const o=D.stations[s.id];const m=D.mun[s.mun]||(D.mun[s.mun]={name:s.mun,st:[],iqar:-1});m.st.push(o);if(o.online&&o.iqar>m.iqar){m.iqar=o.iqar;m.lv=o.lv;m.dom=o.dom;m.pm25=o.pm25}}
  // interpolação IDW por município (MP2,5 24h)
  const pts=ST.filter(s=>D.stations[s.id].online&&D.stations[s.id].pm25!=null).map(s=>({lon:s.lon,lat:s.lat,v:D.stations[s.id].pm25}));
  D.idw={};
  for(const m of MUN){let n=0,dd=0,minD=1e9;for(const p of pts){const d=Math.hypot((p.lon-m.lon)*KX,p.lat-m.lat)+.05;minD=Math.min(minD,d);const w=1/(d*d);n+=w*p.v;dd+=w}
    const v=dd?n/dd:null; D.idw[m.n]={pm25:v,iqar:v==null?null:iqar("MP2,5",v),dist:minD*111};}
}
function levelAlerts(){
  const mk=(lvl,mun,title,txt,when)=>D.alerts.push({lvl,mun,title,txt,when,active:true});
  const muns=Object.values(D.mun).filter(m=>m.iqar>=0).sort((a,b)=>b.iqar-a.iqar);
  for(const m of muns){
    if(m.lv>=5)mk(5,m.name,"Emergência",`IQAr ${m.iqar} (${m.dom}). Suspender atividades ao ar livre.`,"agora");
    else if(m.lv===4)mk(4,m.name,"Alerta",`IQAr ${m.iqar} (${m.dom}). Escolas e unidades de saúde avisadas.`,"agora");
    else if(m.lv===3)mk(3,m.name,"Atenção",`IQAr ${m.iqar} (${m.dom}) na média de 24 horas.`,"agora");
  }
}
const ago=min=>min<90?`há ${min} min`:min<48*60?`há ${Math.round(min/60)} h`:`há ${Math.round(min/1440)} dias`;

/* ---------- Estado de interface ---------- */
let CUR=store.get("mun","Cuiabá"); if(!MUNBY[CUR])CUR="Cuiabá";
let PROF=store.get("prof","geral");
let SEL=null; let RANKALL=false;
const PROFS={geral:"Geral",sens:"Grupo sensível",cri:"Crianças e escolas",atl:"Atividade física",trab:"Trabalho ao ar livre"};
const ADV={
 1:{geral:"Aproveite as atividades ao ar livre.",sens:"Sem restrições. Mantenha o tratamento habitual em dia.",cri:"Recreio e educação física liberados.",atl:"Bom momento para treinar ao ar livre.",trab:"Nenhum cuidado especial."},
 2:{geral:"Pode manter as atividades ao ar livre.",sens:"Reduza esforço intenso e prolongado ao ar livre e tenha a medicação de resgate à mão.",cri:"Atividades liberadas. Observe crianças com asma e reduza exercícios intensos.",atl:"Prefira treinar cedo, longe de avenidas e de queimadas, e encurte treinos longos.",trab:"Faça pausas em local fechado se sentir irritação nos olhos ou garganta."},
 3:{geral:"Reduza o esforço físico ao ar livre, principalmente no fim da tarde e à noite.",sens:"Evite atividades ao ar livre. Feche as janelas nos horários de pico e procure atendimento se os sintomas piorarem.",cri:"Leve o recreio e a educação física para ambiente fechado.",atl:"Troque o treino ao ar livre por treino em ambiente fechado.",trab:"Use máscara PFF2 em trabalho prolongado ao ar livre e beba água com frequência."},
 4:{geral:"Evite atividades ao ar livre. Feche portas e janelas e ligue o purificador, se tiver.",sens:"Fique em ambiente fechado, siga o plano de ação do seu médico e procure atendimento se tiver falta de ar.",cri:"Suspenda as atividades externas na escola e mantenha as crianças em sala fechada.",atl:"Não treine ao ar livre.",trab:"Use PFF2 bem ajustada e reduza o tempo de exposição. O empregador deve reorganizar as tarefas externas."},
 5:{geral:"Fique em casa com portas e janelas fechadas. Saia só se necessário, com PFF2.",sens:"Risco alto. Fique em ambiente com ar filtrado e procure atendimento ao primeiro sinal de piora.",cri:"Escolas devem suspender atividades externas e avaliar a suspensão das aulas presenciais.",atl:"Nenhuma atividade física ao ar livre.",trab:"Suspenda o trabalho externo não essencial. PFF2 obrigatória nas atividades essenciais."}};

function munState(name){
  const m=D.mun[name];
  if(m&&m.st.some(o=>o.online))return{name,iqar:m.iqar,lv:m.lv,dom:m.dom,pm25:m.pm25,pm1h:(()=>{const v=m.st.filter(o=>o.online&&o.pm1h!=null).map(o=>o.pm1h);return v.length?Math.max(...v):null})(),measured:true,st:m.st};
  const e=D.idw[name];return{name,iqar:e.iqar,lv:lvOf(e.iqar),dom:"MP2,5",pm25:e.pm25,pm1h:null,measured:false,dist:e.dist,st:m?m.st:[]};
}
function forecast(name){
  const st=munState(name); const r=rng("fc"+name+SCN); const H=D.now.getHours(); const out=[];
  for(let k=1;k<=72;k++){const h=(H+k)%24;let tr;
    if(SCN==="fogo")tr=1+.004*k; else if(name==="São Félix do Araguaia")tr=k<24?1+.012*k:1.25-.006*(k-24); else tr=k<30?1-.004*k:.88-.002*(k-30);
    out.push(Math.max(2,st.pm25*diurnal(h)*tr*(0.9+.2*r())))}
  return out;
}

/* ---------- Componentes ---------- */
function dial(i,lv){
  const R=70,C=2*Math.PI*R,frac=Math.min(i/200,1)*.75;
  return `<div class="dial"><svg viewBox="0 0 168 168" aria-hidden="true"><circle cx="84" cy="84" r="${R}" fill="none" stroke="var(--line)" stroke-width="14" stroke-dasharray="${C*.75} ${C}" transform="rotate(135 84 84)" stroke-linecap="round"/><circle cx="84" cy="84" r="${R}" fill="none" stroke="${LV[lv].c}" stroke-width="14" stroke-dasharray="${C*frac} ${C}" transform="rotate(135 84 84)" stroke-linecap="round"/></svg><div class="v"><b class="num">${i}</b><span>IQAr</span></div></div>`;
}
function renderHero(){
  const s=munState(CUR); const el=$("#hero"); el.style.setProperty("--lvl",LV[s.lv].c);
  const t=D.now; const hh=t.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  const dateTxt=t.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const src=s.measured?`${s.st.filter(o=>o.online).length} equipamento(s) no município`:`Estimativa a partir de sensores a ${fmt(s.dist)} km`;
  el.innerHTML=`${dial(s.iqar,s.lv)}
  <div class="hero-txt">
    <span class="eyebrow">${dateTxt} · atualizado às ${hh}</span>
    <h1>${s.name}: qualidade do ar ${LV[s.lv].name.toLowerCase()}</h1>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${pill(s.lv)}<span class="tag">${s.measured?"Medido":"Estimado"}</span><span class="small muted">${src}</span></div>
    <div class="facts">
      <div><b>${fmt(s.pm25,1)}</b><span>MP2,5 média 24 h (µg/m³)</span></div>
      <div><b>${s.pm1h==null?"–":fmt(s.pm1h,1)}</b><span>MP2,5 última hora</span></div>
      <div><b>${s.dom}</b><span>poluente dominante</span></div>
      <div><b>${fmt(s.pm25/15,1)}×</b><span>a diretriz da OMS (15 µg/m³)</span></div>
    </div>
    <div class="profiles" role="group" aria-label="Recomendação para o perfil">${Object.entries(PROFS).map(([k,v])=>`<button type="button" class="chip" data-prof="${k}" aria-pressed="${k===PROF}">${v}</button>`).join("")}</div>
    <div class="advice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><div><b>${ADV[s.lv][PROF]}</b><p class="small muted" style="margin-top:4px">${HEALTH[s.lv]}</p></div></div>
  </div>`;
  el.querySelectorAll("[data-prof]").forEach(b=>b.onclick=()=>{PROF=b.dataset.prof;store.set("prof",PROF);renderHero()});
}
function renderForecast(){
  if(D.real){
    const ms=munState(CUR); const st=ms.st.filter(o=>o.online).sort((a,b)=>b.iqar-a.iqar)[0];
    $("#fc-title").textContent=`${CUR}: últimas 48 horas`;$("#fc-sub").textContent="Medição horária";
    $("#fc").innerHTML=(st?lineChart(st.ser)+`<p class="small muted" style="margin-top:6px">MP2,5 horário medido em ${st.s.name} (${TYPE[st.s.t]}).</p>`:`<p class="muted">Este município ainda não tem equipamento próprio. O valor exibido é estimado a partir dos sensores vizinhos.</p>`)+
      `<p class="small" style="margin-top:10px;padding:10px 12px;background:var(--bg);border-radius:10px"><b>Previsão de 72 horas:</b> em desenvolvimento (fase 2). Vai combinar modelo de transporte de fumaça, focos de calor do INPE e previsão meteorológica.</p>`;
    return;
  }
  const f=forecast(CUR); const max=Math.max(25,...f)*1.15;
  $("#fc-title").textContent=`Previsão para ${CUR}, próximas 72 horas`;$("#fc-sub").textContent="Demonstração do modelo de previsão";
  const days=[0,1,2].map(d=>{const dt=new Date(D.now.getTime()+(d+1)*864e5/1);return dt.toLocaleDateString("pt-BR",{weekday:"short",day:"numeric"})});
  const sums=[0,1,2].map(d=>{const sl=f.slice(d*24,d*24+24);const avg=sl.reduce((a,b)=>a+b,0)/24;const pk=Math.max(...sl);const i=iqar("MP2,5",avg);return{lv:lvOf(i),i,pk,hr:(D.now.getHours()+d*24+sl.indexOf(pk)+1)%24}});
  $("#fc").innerHTML=`<div class="fc" role="img" aria-label="Barras horárias de MP2,5 previsto">${f.map((v,k)=>`<i style="height:${(v/max*100).toFixed(1)}%;background:${LV[lvOf(iqar("MP2,5",v))].c}" title="+${k+1} h: ${fmt(v,0)} µg/m³"></i>`).join("")}</div>
  <div class="fc-days"><div>Próximas 24 h</div><div>24 a 48 h</div><div>48 a 72 h</div></div>
  <div class="fc-sum">${sums.map((s,d)=>`<div><span class="eyebrow">${days[d]}</span><div style="margin:4px 0">${pill(s.lv)}</div><span class="small muted">pico de ${fmt(s.pk)} µg/m³ por volta das ${s.hr}h</span></div>`).join("")}</div>
  <p class="small muted" style="margin-top:10px">Cada barra é uma hora de MP2,5 previsto, colorida pela faixa do IQAr. A previsão combina o modelo de transporte de fumaça, focos de calor por satélite e a previsão meteorológica, ajustada pelos dados medidos.</p>`;
}
function renderFire(){
  if(D.real){$("#fire").innerHTML=`<p class="muted">Integração com os focos de calor do INPE (BDQueimadas) e com o vento em desenvolvimento.</p><p class="small muted" style="margin-top:8px">Quando entrar, este painel mostra os focos das últimas 24 horas, os municípios com mais focos e a direção provável da fumaça.</p>`;return}
  const counts={};const r=rng("fm"+SCN);
  const top=SCN==="fogo"?[["Colniza",412],["São Félix do Araguaia",388],["Poconé",301],["Cáceres",246],["Alta Floresta",219]]:[["São Félix do Araguaia",31],["Colniza",17],["Guarantã do Norte",12],["Novo Mundo",9]];
  $("#fire").innerHTML=`<div class="stats"><div class="stat"><b class="num">${fmt(D.fireTotal)}</b><span class="small muted">focos em MT</span></div><div class="stat"><b class="num">${D.wind.spd} km/h</b><span class="small muted">vento de ${D.wind.dir} em Cuiabá</span></div></div>
  <table style="margin-top:10px"><thead><tr><th>Município</th><th class="r">Focos</th></tr></thead><tbody>${top.map(t=>`<tr><td>${t[0]}</td><td class="r num">${t[1]}</td></tr>`).join("")}</tbody></table>
  <p class="small muted" style="margin-top:8px">${SCN==="fogo"?"A fumaça do Pantanal e do noroeste chega à Baixada Cuiabana com o vento de nordeste girando para sul à noite.":"Poucos focos, concentrados no Araguaia. A chuva dos últimos dias limpa a atmosfera na maior parte do estado."} Fonte prevista: INPE/BDQueimadas.</p>`;
}
function renderRank(){
  const list=Object.keys(D.mun).map(munState).sort((a,b)=>b.iqar-a.iqar);
  const shown=RANKALL?list:list.slice(0,8);
  $("#rank").innerHTML=shown.map(s=>`<li data-mun="${s.name}" tabindex="0"><div><b>${s.name}</b><div class="small muted">${s.measured?REGION[s.name]||"":"sensor fora do ar · estimado"}</div></div><div class="bar"><i style="width:${Math.min(100,s.iqar/2)}%;background:${LV[s.lv].c}"></i></div><div class="score">${s.iqar}</div></li>`).join("");
  $$("#rank li").forEach(li=>{const go=()=>setMun(li.dataset.mun);li.onclick=go;li.onkeydown=e=>{if(e.key==="Enter")go()}});
  const mb=document.getElementById("rank-more");mb.textContent=RANKALL?"Mostrar menos":`Ver todos os ${list.length} municípios`;mb.onclick=()=>{RANKALL=!RANKALL;renderRank()};
}
function alertHTML(a){return `<div class="alert" style="--lvl:${LV[a.lvl].c}"><i></i><div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${a.title}</b><span class="tag">${a.mun}</span>${a.active?"":`<span class="tag">encerrado</span>`}</div><p class="small" style="margin-top:3px">${a.txt}</p><span class="small muted">${a.when}</span></div></div>`}
function renderAlerts(){
  const act=D.alerts.filter(a=>a.active).sort((a,b)=>b.lvl-a.lvl);
  $("#home-alerts").innerHTML=act.length?act.slice(0,4).map(alertHTML).join("")+(act.length>4?`<a class="small" href="#alertas">e mais ${act.length-4} alertas</a>`:""):`<p class="muted small">Nenhum alerta em vigor.</p>`;
  $("#all-alerts").innerHTML=D.alerts.map(alertHTML).join("");
}

/* ---------- Mapa ---------- */
function shape(t,x,y,r,fill){
  if(t==="thermo")return `<rect x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" rx="2" fill="${fill}" stroke="var(--surface)" stroke-width="2.5"/>`;
  if(t==="aqms")return `<path d="M${x} ${y-r*1.3}L${x+r*1.3} ${y}L${x} ${y+r*1.3}L${x-r*1.3} ${y}Z" fill="${fill}" stroke="var(--surface)" stroke-width="2.5"/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="var(--surface)" stroke-width="2"/>`;
}
function renderMap(host,opt){
  const L=opt.layers; const W=GEO.W,H=GEO.H;
  let s=`<svg class="mapsvg" viewBox="-10 -10 ${W+20} ${H+20}" role="img" aria-label="Mapa de Mato Grosso com a qualidade do ar por município">`;
  for(const m of MUN){
    const ms=D.mun[m.n]&&D.mun[m.n].st.some(o=>o.online);
    let fill="var(--map-empty)",op=1;
    if(ms){fill=LV[munState(m.n).lv].c;op=.9}
    else if(L.idw){fill=LV[lvOf(D.idw[m.n].iqar)].c;op=.38}
    const cur=m.n===CUR;
    s+=`<path class="m" d="${m.d}" fill="${fill}" fill-opacity="${op}" data-mun="${m.n}"${cur?' style="stroke:var(--ink);stroke-width:2.2"':""}/>`;
  }
  s+=`<path class="outline" d="${GEO.outline}"/>`;
  if(L.fire){s+=`<g fill="#D9480F" fill-opacity=".75">`;for(const f of D.fires){const[x,y]=proj(f[0],f[1]);s+=`<path d="M${x.toFixed(0)} ${(y-4).toFixed(0)}l3.5 6h-7z"/>`}s+=`</g>`}
  if(L.wind){const a=(D.wind.from+180)*Math.PI/180;s+=`<g stroke="var(--ink)" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round">`;for(let gx=80;gx<W;gx+=120)for(let gy=80;gy<H;gy+=120){const dx=Math.sin(a)*34,dy=-Math.cos(a)*34;s+=`<path d="M${gx-dx/2} ${gy-dy/2}l${dx} ${dy}m0 0l${-dx*.3+dy*.2} ${-dy*.3-dx*.2}m${dx*.3-dy*.2} ${dy*.3+dx*.2}l${-dx*.3-dy*.2} ${-dy*.3+dx*.2}"/>`}s+=`</g>`}
  // estações: offsets para separar pontos sobrepostos em Cuiabá na escala do estado
  const order=[...ST].sort((a,b)=>(a.t==="pa")-(b.t==="pa")).reverse();
  for(const st of order){
    if(st.t==="pa"&&!L.pa)continue; if(st.t!=="pa"&&!L.ref)continue;
    const o=D.stations[st.id]; let[x,y]=proj(st.lon,st.lat);
    if(opt.spread){const sp={"thermo-ufmt":[-16,-14],"aqms06-centro":[16,-14],"pa-ufmt":[-30,8],"pa-cpa":[0,-34],"pa-coxipo":[14,14],"pa-pedra90":[30,28],"pa-vg-centro":[-30,30],"pa-vg-cristo":[-46,6]}[st.id];if(sp){x+=sp[0];y+=sp[1]}}
    const r=st.t==="pa"?(opt.small?6:8):(opt.small?8:10);
    const fill=o.online?LV[o.lv].c:"var(--nd)";
    s+=`<g class="st" data-st="${st.id}" tabindex="0" role="button" aria-label="${TYPE[st.t]} ${st.name}, ${st.mun}, IQAr ${o.iqar}">${shape(st.t,x,y,r,fill)}${SEL===st.id?`<circle cx="${x}" cy="${y}" r="${r+6}" fill="none" stroke="var(--ink)" stroke-width="2"/>`:""}</g>`;
  }
  if(opt.labels){for(const n of ["Cuiabá","Sinop","Rondonópolis","Barra do Garças","São Félix do Araguaia","Cáceres","Alta Floresta","Pontes e Lacerda"]){const st=ST.find(s=>s.mun===n);if(!st)continue;const[x,y]=proj(st.lon,st.lat);const left=["São Félix do Araguaia","Barra do Garças"].includes(n);s+=`<text x="${left?x-14:x+14}" y="${y+(n==="Cuiabá"?40:5)}" text-anchor="${left?"end":"start"}">${n}</text>`}}
  s+=`</svg>`;
  const tip=host.querySelector(".tip"); host.innerHTML=s; if(tip)host.appendChild(tip);
  const svg=host.querySelector("svg");
  svg.querySelectorAll("path.m").forEach(p=>{
    p.onclick=()=>setMun(p.dataset.mun);
    if(tip){p.onmousemove=e=>{const n=p.dataset.mun;const ms=munState(n);const b=host.getBoundingClientRect();tip.style.display="block";tip.style.left=(e.clientX-b.left+12)+"px";tip.style.top=(e.clientY-b.top+12)+"px";tip.innerHTML=`<b>${n}</b> · IQAr ${ms.iqar} ${LV[ms.lv].name}${ms.measured?"":" (estimado)"}`};p.onmouseleave=()=>tip.style.display="none"}
  });
  svg.querySelectorAll(".st").forEach(g=>{const go=e=>{e.stopPropagation();SEL=g.dataset.st;if(opt.onStation)opt.onStation(SEL)};g.onclick=go;g.onkeydown=e=>{if(e.key==="Enter")go(e)}});
}
function legendHTML(){return Object.values(LV).filter(Boolean).map(l=>`<span><i class="dot" style="background:${l.c}"></i>${l.name}</span>`).join("")+`<span><i class="dot" style="background:var(--nd)"></i>Sem dado</span><span><svg width="12" height="12"><rect x="1" y="1" width="10" height="10" fill="var(--muted)"/></svg>Referência</span><span><svg width="12" height="12"><path d="M6 0l6 6-6 6-6-6z" fill="var(--muted)"/></svg>AQMS06</span><span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="var(--muted)"/></svg>PurpleAir</span>`}
const layers=()=>({idw:$("#ly-idw").checked,ref:$("#ly-ref").checked,pa:$("#ly-pa").checked,fire:$("#ly-fire").checked,wind:$("#ly-wind").checked});
function renderMaps(){
  renderMap($("#mini-map"),{layers:{idw:true,ref:true,pa:true,fire:SCN==="fogo",wind:false},small:true,spread:true,onStation:id=>{location.hash="#mapa";SEL=id;renderMaps();renderPanel()}});
  renderMap($("#big-map"),{layers:layers(),labels:true,spread:true,onStation:()=>{renderMaps();renderPanel()}});
  $("#legend-mini").innerHTML=legendHTML(); $("#legend-big").innerHTML=legendHTML()+`<span class="muted">Municípios em tom claro: estimativa por interpolação</span>`;
}

/* ---------- Gráfico de série ---------- */
function lineChart(ser,{w=560,h=210,unit="µg/m³",thr=BP["MP2,5"].b}={}){
  const pl=34,pr=8,pt=8,pb=24; const vals=ser.filter(v=>v!=null); const max=(vals.length?Math.max(...vals):10)*1.15; const ymax=max<=20?20:max<=60?60:max<=100?100:Math.ceil(max/50)*50;
  const X=i=>pl+(w-pl-pr)*i/(ser.length-1), Y=v=>pt+(h-pt-pb)*(1-v/ymax);
  let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Série de MP2,5 nas últimas 48 horas">`;
  // faixas
  let lo=0;thr.forEach((b,i)=>{const top=Math.min(b,ymax);if(lo<ymax){s+=`<rect x="${pl}" y="${Y(top)}" width="${w-pl-pr}" height="${Y(lo)-Y(top)}" fill="${LV[i+1].c}" fill-opacity=".1"/>`}lo=b});
  const ticks=[0,ymax/4,ymax/2,ymax*3/4,ymax];
  s+=`<g class="grid">${ticks.map(t=>`<line x1="${pl}" x2="${w-pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${pl-6}" y="${Y(t)+4}" text-anchor="end">${fmt(t)}</text>`).join("")}</g>`;
  const H=D.now.getHours();
  for(let i=0;i<ser.length;i+=12){const hr=(H-(ser.length-1-i)+96)%24;s+=`<text x="${X(i)}" y="${h-6}" text-anchor="middle">${String(hr).padStart(2,"0")}h</text>`}
  // segmentos contínuos (lacunas de dados ficam em branco)
  const segs=[];let cur=[];ser.forEach((v,i)=>{if(v==null){if(cur.length)segs.push(cur);cur=[]}else cur.push([X(i),Y(v)])});if(cur.length)segs.push(cur);
  for(const g of segs){const p=g.map(q=>`${q[0].toFixed(1)},${q[1].toFixed(1)}`);
    if(g.length>1)s+=`<path d="M${p.join("L")}L${g[g.length-1][0].toFixed(1)},${Y(0)}L${g[0][0].toFixed(1)},${Y(0)}Z" fill="var(--accent)" fill-opacity=".12"/>`;
    s+=g.length>1?`<path d="M${p.join("L")}" fill="none" stroke="var(--accent)" stroke-width="2"/>`:`<circle cx="${g[0][0]}" cy="${g[0][1]}" r="2" fill="var(--accent)"/>`}
  const li=ser.map(v=>v!=null).lastIndexOf(true);
  if(li>=0)s+=`<circle cx="${X(li)}" cy="${Y(ser[li])}" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`;
  if(li<0)s+=`<text x="${w/2}" y="${h/2}" text-anchor="middle">Sem dados de MP2,5 nas últimas 48 horas</text>`;
  s+=`<text x="${pl+4}" y="${pt+12}">${unit}</text></svg>`;
  return s;
}
function renderPanel(){
  const el=$("#station-panel"); if(!SEL){el.innerHTML=`<div class="panel-empty">Selecione uma estação no mapa.</div>`;return}
  const o=D.stations[SEL],s=o.s;
  const gas=s.t!=="pa"?Object.entries(o.pol).filter(([p])=>p!=="MP2,5").map(([p,v])=>`<div><b>${fmt(v,p==="CO"?1:0)}</b><span>${p} ${BP[p]?BP[p].per+" ("+BP[p].u+")":"(ppb)"}</span></div>`).join(""):`<div><b>${fmt(o.pm10)}</b><span>MP10 24 h (µg/m³)</span></div><div><b>${fmt(o.rh)}%</b><span>umidade relativa</span></div>`;
  el.innerHTML=`<span class="eyebrow">${TYPE[s.t]}</span><h3 style="margin:4px 0 2px">${s.name}</h3><p class="small muted">${s.mun} · ${s.op}</p>
  <div style="margin:10px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${o.online?pill(o.lv,"IQAr "+o.iqar+" · "+LV[o.lv].name):`<span class="pill" style="background:var(--nd)">Fora do ar</span>`}<span class="small muted">dominante: ${o.dom}</span></div>
  <div class="kv"><div><b>${fmt(o.pm1h,1)}</b><span>MP2,5 1 h</span></div><div><b>${fmt(o.pm25,1)}</b><span>MP2,5 24 h</span></div>${gas}</div>
  ${lineChart(o.ser)}
  <div class="health" style="margin-top:8px"><span><i class="dot" style="background:${o.online?"var(--n1)":"var(--n4)"}"></i>${o.online?"Última leitura "+ago(o.lastSeenMin):(o.qc?o.qc:"Sem dados "+ago(o.lastSeenMin))}</span><span>Completude 24 h: ${o.comp==null?"–":o.comp+"%"}</span>${o.rep?"":`<span>Média 24 h ainda não representativa</span>`}${o.ab!=null?`<span>Canais A/B: diferença ${fmt(o.ab,1)} µg/m³</span><span>Correção EPA + ajuste local</span>`:`<span>Método de referência</span>`}</div>`;
}

/* ---------- Alertas: formulário ---------- */
function fillSelects(){
  const opts=MUN.map(m=>m.n).sort((a,b)=>a.localeCompare(b,"pt")).map(n=>`<option${n===CUR?" selected":""}>${n}</option>`).join("");
  $("#a-mun").innerHTML=opts; $("#r-mun").innerHTML=opts;
}
function alertPreview(){
  const sel=[...$("#a-mun").selectedOptions].map(o=>o.value); const m=sel[0]||CUR; const st=munState(m);
  const want=+$("#a-lvl").value; const prof=$("#a-prof").value; const lv=Math.max(want,st.lv);
  const fake=Math.max(st.iqar,LV[lv].lo+12);
  $("#a-preview").innerHTML=`<div class="hd">${lv>=4?"Alerta":"Atenção"}: ar ${LV[lv].name.toLowerCase()} em ${m}</div>IQAr ${fake} (MP2,5). ${ADV[lv][prof]}\n\nPrevisão: melhora a partir das 10h de amanhã.\nDetalhes e mapa: qar.mt.gov.br/${norm(m).replace(/ /g,"-")}`;
}

/* ---------- Boletim ---------- */
function bulletinData(){
  const rows=Object.keys(D.mun).map(munState).sort((a,b)=>b.iqar-a.iqar);
  const regs={};rows.forEach(r=>{const g=REGION[r.name]||"Outros";if(!regs[g]||r.iqar>regs[g].iqar)regs[g]={...r,reg:g}});
  return{rows,regs:Object.values(regs).sort((a,b)=>b.iqar-a.iqar)};
}
function renderBulletin(){
  const {rows,regs}=bulletinData(); const d=D.now.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
  const worst=rows[0]; const cnt=[0,0,0,0,0,0];rows.forEach(r=>cnt[r.lv]++);
  const num=String(SCN==="fogo"?255:325);
  const real=D.real; const hr=D.now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  const sum=real?`${rows.filter(r=>r.measured).length} municípios com medição válida. ${cnt[1]} na faixa Boa, ${cnt[2]} Moderada e ${cnt[3]+cnt[4]+cnt[5]} em Ruim ou pior. Pior situação em ${worst.name} (IQAr ${worst.iqar}, ${LV[worst.lv].name}, poluente ${worst.dom}).`:SCN==="fogo"?`Episódio crítico de poluição por queimadas em curso. ${cnt[4]+cnt[5]} dos ${rows.length} municípios monitorados estão nas faixas Muito ruim ou Péssima, com pior situação em ${worst.name} (IQAr ${worst.iqar}). A fumaça vem de focos no Pantanal, no noroeste e no Araguaia, e a previsão indica piora na madrugada.`:`Qualidade do ar boa na maior parte do estado após as chuvas da semana. ${cnt[1]} dos ${rows.length} municípios monitorados estão na faixa Boa. A exceção é ${worst.name} (IQAr ${worst.iqar}, ${LV[worst.lv].name}), afetada por focos de calor no vale do Araguaia, com previsão de piora durante a noite.`;
  $("#bulletin").innerHTML=`<div class="bul-head"><div><span class="eyebrow">${real?"Rascunho automático":"Boletim nº "+num+"/2026"} · Sema-MT e UFMT/PPGFA</span><h2 style="margin-top:4px">Qualidade do ar em Mato Grosso</h2><p class="muted">${d} · médias de 24 horas até as ${real?hr:"10h"}</p></div>${pill(worst.lv,"Pior: N"+worst.lv+" "+LV[worst.lv].name)}</div>
  <h3>Resumo</h3><p style="margin-top:4px;max-width:70ch">${sum}</p>
  <div class="regions">${regs.map(r=>`<div style="--lvl:${LV[r.lv].c}"><span class="small muted">${r.reg}</span><b>${LV[r.lv].name}</b><span class="small num">IQAr ${r.iqar} · ${r.name}</span></div>`).join("")}</div>
  <h3>Municípios monitorados</h3>
  <div class="tblwrap"><table style="margin-top:6px"><thead><tr><th>Município</th><th class="r">IQAr</th><th>Classe</th><th class="r">MP2,5 24 h</th><th>Dominante</th>${real?"":"<th>Amanhã</th>"}</tr></thead><tbody>${rows.map(r=>{if(real)return `<tr><td>${r.name}${r.measured?"":" *"}</td><td class="r num"><b>${r.iqar}</b></td><td>${pill(r.lv,LV[r.lv].name)}</td><td class="r num">${fmt(r.pm25,1)}</td><td>${r.dom}</td></tr>`;const f=forecast(r.name).slice(14,38);const fi=iqar("MP2,5",f.reduce((a,b)=>a+b,0)/24);const fl=lvOf(fi);return `<tr><td>${r.name}${r.measured?"":" *"}</td><td class="r num"><b>${r.iqar}</b></td><td>${pill(r.lv,LV[r.lv].name)}</td><td class="r num">${fmt(r.pm25,1)}</td><td>${r.dom}</td><td><i class="dot" style="background:${LV[fl].c}"></i> ${LV[fl].name}</td></tr>`}).join("")}</tbody></table></div>
  <p class="small muted" style="margin-top:6px">* Sensor fora do ar; valor estimado por interpolação.</p>
  <h3 style="margin-top:14px">Recomendações</h3>
  <ul style="margin:6px 0 0;padding-left:18px">${[...new Set(rows.map(r=>r.lv))].sort((a,b)=>b-a).map(l=>`<li><b>${LV[l].name}:</b> ${ADV[l].geral} Grupos sensíveis: ${ADV[l].sens.charAt(0).toLowerCase()+ADV[l].sens.slice(1)}</li>`).join("")}</ul>
  <p class="small muted" style="margin-top:14px">Método: IQAr calculado conforme a Resolução Conama nº 506/2024 e a orientação técnica do MMA de janeiro de 2025. Sensores PurpleAir corrigidos pela equação da US EPA e por ajuste local com a estação de referência Thermo Grid 5000 (UFMT). Dados sujeitos a validação.</p>`;
  // social card
  const c=munState("Cuiabá");
  $("#social").innerHTML=`<div class="social${c.lv===2?" l2":""}" style="--lvl:${LV[c.lv].c}"><div><div style="font-weight:700">QAR · Mato Grosso</div><div style="opacity:.85;font-size:.85rem">${d}</div></div><div><div style="opacity:.9">Cuiabá</div><b>${c.iqar}</b><div style="font-weight:700;font-size:1.2rem">Qualidade ${LV[c.lv].name.toLowerCase()}</div></div><div style="font-size:.82rem;opacity:.92">${ADV[c.lv].geral}</div></div>`;
  // arquivo
  if(real){$("#archive").innerHTML=`<li class="muted small">O arquivo começa com o primeiro boletim validado.</li>`;return}
  const r=rng("arq"+SCN);const items=[];for(let k=1;k<=6;k++){const dt=new Date(D.now.getTime()-k*864e5);const lv=SCN==="fogo"?3+Math.floor(r()*3):(k===1?3:1+Math.floor(r()*2));items.push(`<li><span>${dt.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})} · nº ${+num-k}</span>${pill(lv,LV[lv].name)}</li>`)}
  $("#archive").innerHTML=items.join("");
}
function bulletinText(kind){
  const {rows}=bulletinData(); const d=D.now.toLocaleDateString("pt-BR");
  if(kind==="csv"||kind==="csvall"){
    if(kind==="csv")return "municipio;iqar;classe;mp25_24h;dominante\n"+rows.map(r=>`${r.name};${r.iqar};${LV[r.lv].name};${r.pm25.toFixed(1)};${r.dom}`).join("\n");
    return "estacao;tipo;municipio;mp25_1h;mp25_24h;iqar;online\n"+ST.map(s=>{const o=D.stations[s.id];return `${s.id};${s.t};${s.mun};${o.pm1h.toFixed(1)};${o.pm25.toFixed(1)};${o.iqar};${o.online}`}).join("\n");
  }
  const top=rows.slice(0,5).map(r=>`${r.name}: ${r.iqar} (${LV[r.lv].name})`).join("\n");
  if(kind==="wa")return `*Qualidade do ar em MT · ${d}*\n\n${top}\n\n${ADV[rows[0].lv].geral}\n\nMapa e alertas: qar.mt.gov.br`;
  if(kind==="radio")return `Boletim da qualidade do ar, ${d}. Em ${rows[0].name}, o ar está ${LV[rows[0].lv].name.toLowerCase()}, com índice ${rows[0].iqar}. Em Cuiabá, o índice é ${munState("Cuiabá").iqar}, qualidade ${LV[munState("Cuiabá").lv].name.toLowerCase()}. A recomendação é: ${ADV[rows[0].lv].geral} Para receber alertas, acesse qar ponto m t ponto gov ponto b r.`;
  return `A Secretaria de Estado de Meio Ambiente (Sema-MT) e a UFMT divulgam o boletim de qualidade do ar de ${d}. ${rows.filter(r=>r.lv>=3).length} município(s) registram qualidade Ruim ou pior. Pior índice: ${rows[0].name} (${rows[0].iqar}). Dados completos em qar.mt.gov.br.`;
}

/* ---------- Comunidade ---------- */
let POSTS=[
 {tp:"Fumaça",mun:"São Félix do Araguaia",who:"Marlene S.",t:"há 25 min",txt:"Fumaça forte vindo da direção da ilha do Bananal desde o fim da tarde. Cheiro de mato queimado dentro de casa.",n:23,v:"Verificado: 14 focos de calor a menos de 30 km e sensor da orla em N2 subindo."},
 {tp:"Queimada",mun:"Cuiabá",who:"Rafael T.",t:"há 1 h",txt:"Terreno baldio pegando fogo na Av. Fernando Corrêa, perto do Coxipó. Bombeiros já foram chamados.",n:11,v:"Encaminhado à Defesa Civil e ao Corpo de Bombeiros (193)."},
 {tp:"Odor",mun:"Várzea Grande",who:"Escola Est. Pres. Médici",t:"há 3 h",txt:"Cheiro forte de borracha queimada no período da manhã. Alunos reclamaram de ardência nos olhos.",n:8,v:"Em análise pela equipe de fiscalização."},
 {tp:"Fumaça",mun:"Poconé",who:"Pousada Rio Clarinho",t:"ontem",txt:"Depois da chuva de ontem o céu abriu. Primeira vez em duas semanas que dá para ver o horizonte.",n:41,v:"Confirmado: IQAr voltou a Moderada às 21h."}];
const reacted=new Set();
let FILT="todos";
function renderFeed(){
  $("#feed").innerHTML=POSTS.map((p,i)=>({p,i})).filter(({p})=>FILT==="todos"||p.tp===FILT).map(({p,i})=>`<article class="post"><header><span><b style="color:var(--ink)">${p.who}</b> · ${p.mun}</span><span>${p.t}</span></header><span class="tag">${p.tp}</span><p style="margin-top:6px">${p.txt.replace(/</g,"&lt;")}</p>${p.img?`<img src="${p.img}" alt="Foto enviada no relato">`:""}<footer><button type="button" class="react" data-i="${i}" aria-pressed="${reacted.has(i)}">Eu também sinto · ${p.n+(reacted.has(i)?1:0)}</button><span class="verify">${p.v}</span></footer></article>`).join("");
  $$("#feed .react").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;reacted.has(i)?reacted.delete(i):reacted.add(i);renderFeed()});
}

/* ---------- Dados ---------- */
function renderCalib(){
  const r=rng("cal");const pts=[];
  for(let i=0;i<220;i++){const ref=Math.exp(Math.log(3)+r()*Math.log(150/3));const rh=30+r()*55;const raw=Math.max(1,(ref-5.75+.0862*rh)/.524*(0.85+r()*.3));
    let epa; if(raw<30)epa=.524*raw-.0862*rh+5.75; else if(raw<50){const k=raw/20-1.5;epa=(.786*k+.524*(1-k))*raw-.0862*rh+5.75} else if(raw<210)epa=.786*raw-.0862*rh+5.75; else epa=.69*raw+8.84e-4*raw*raw+2.966;
    const loc=epa*.94+.9; pts.push([ref,raw,loc])}
  const stats=k=>{const n=pts.length;const mx=pts.reduce((a,p)=>a+p[0],0)/n,my=pts.reduce((a,p)=>a+p[k],0)/n;let sxy=0,sxx=0,syy=0,se=0;pts.forEach(p=>{sxy+=(p[0]-mx)*(p[k]-my);sxx+=(p[0]-mx)**2;syy+=(p[k]-my)**2;se+=(p[k]-p[0])**2});return{r2:sxy*sxy/(sxx*syy),rmse:Math.sqrt(se/n)}};
  const a=stats(1),b=stats(2); const w=520,h=300,pl=40,pb=30,pt=10,pr=10,M=200;
  const X=v=>pl+(w-pl-pr)*v/M,Y=v=>pt+(h-pt-pb)*(1-Math.min(v,M)/M);
  let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Dispersão entre PurpleAir e estação de referência">`;
  s+=`<g class="grid">${[0,50,100,150,200].map(t=>`<line x1="${pl}" x2="${w-pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${pl-6}" y="${Y(t)+4}" text-anchor="end">${t}</text><text x="${X(t)}" y="${h-12}" text-anchor="middle">${t}</text>`).join("")}</g>`;
  s+=`<line x1="${X(0)}" y1="${Y(0)}" x2="${X(M)}" y2="${Y(M)}" stroke="var(--ink)" stroke-dasharray="4 4" stroke-opacity=".5"/>`;
  pts.forEach(p=>{if(p[1]<=M)s+=`<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.6" fill="var(--muted)" fill-opacity=".35"/>`});
  pts.forEach(p=>{s+=`<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[2]).toFixed(1)}" r="2.6" fill="var(--accent)" fill-opacity=".75"/>`});
  s+=`<text x="${w/2}" y="${h-1}" text-anchor="middle">Thermo Grid 5000, MP2,5 (µg/m³)</text><text x="${pl+6}" y="${pt+12}">PurpleAir (µg/m³)</text><text x="${X(160)}" y="${Y(172)}" >1:1</text></svg>`;
  $("#calib").innerHTML=s+`<div class="legend" style="margin-top:6px"><span><i class="dot" style="background:var(--muted);opacity:.5"></i>Bruto (cf_1): R² ${fmt(a.r2,2)} · RMSE ${fmt(a.rmse,1)}</span><span><i class="dot" style="background:var(--accent)"></i>Corrigido: R² ${fmt(b.r2,2)} · RMSE ${fmt(b.rmse,1)}</span></div>`;
}
function renderNet(){
  const on=ST.filter(s=>D.stations[s.id].online).length;
  $("#net-sum").textContent=`${on} de ${ST.length} equipamentos transmitindo`;
  $("#net").innerHTML=`<thead><tr><th>Equipamento</th><th>Tipo</th><th>Município</th><th>Operador</th><th>Status</th><th class="r">Completude 24 h</th><th class="r">Canais A/B</th></tr></thead><tbody>${ST.map(s=>{const o=D.stations[s.id];return `<tr><td>${s.name}</td><td>${s.t==="pa"?"PurpleAir":s.t==="aqms"?"AQMS06":"Thermo Grid 5000"}</td><td>${s.mun}</td><td>${s.op}</td><td><i class="dot" style="background:${o.online?"var(--n1)":"var(--n4)"}"></i> ${o.online?ago(o.lastSeenMin):(o.qc||"sem dados "+ago(o.lastSeenMin))}</td><td class="r num">${o.comp==null?"–":o.comp+"%"}</td><td class="r num">${o.ab==null?"–":fmt(o.ab,1)+" µg/m³"}</td></tr>`}).join("")}</tbody>`;
}
function renderStatic(){
  const munCount=new Set(ST.map(s=>s.mun)).size;
  $("#cov").innerHTML=`<div class="stat"><b>${munCount}<span class="muted" style="font-size:1rem"> / 142</span></b><span class="small muted">municípios com monitoramento</span></div><div class="stat"><b>${ST.filter(s=>s.t==="pa").length}</b><span class="small muted">sensores PurpleAir no portal</span></div><div class="stat"><b>2</b><span class="small muted">estações multipoluente (Thermo e AQMS06)</span></div><div class="stat"><b>${fmt(ST.length*288)}</b><span class="small muted">leituras por dia</span></div>`;
  const pols=Object.keys(BP);
  $("#iqar-tbl").innerHTML=`<thead><tr><th>Índice</th><th>Classe</th>${pols.map(p=>`<th class="r">${p} ${BP[p].per}</th>`).join("")}</tr></thead><tbody>${[1,2,3,4,5].map(n=>`<tr><td class="num">${LV[n].lo}–${LV[n].hi}</td><td>${pill(n,"N"+n+" "+LV[n].name)}</td>${pols.map(p=>{const b=BP[p].b;return `<td class="r num">${n===1?0:"&gt;"+b[n-2]}–${b[n-1]}</td>`}).join("")}</tr>`).join("")}</tbody>`;
}

/* ---------- Navegação e eventos ---------- */
const VIEWS=["agora","mapa","alertas","boletins","comunidade","dados","rede","equipe"];
function route(){const v=VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):"agora";$$(".view").forEach(s=>s.classList.toggle("on",s.id==="v-"+v));$$("nav.main a").forEach(a=>{if(a.dataset.v===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});window.scrollTo(0,0)}
function setMun(n){CUR=n;store.set("mun",n);renderHero();renderForecast();renderMaps();alertPreview();toast(`Mostrando ${n}`)}
let tt;function toast(m){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(tt);tt=setTimeout(()=>t.style.display="none",2200)}
function renderAll(){generate();if(SEL&&!D.stations[SEL])SEL=null;if(!MUNBY[CUR]||(!D.mun[CUR]&&D.idw[CUR].iqar==null))CUR="Cuiabá";renderStatic();renderHero();renderForecast();renderFire();renderRank();renderAlerts();renderMaps();renderPanel();renderBulletin();renderNet();alertPreview()}
function bind(){
  const setScn=v=>{SCN=v;store.set("scn",v);$("#sc-hoje").setAttribute("aria-pressed",v==="hoje");$("#sc-fogo").setAttribute("aria-pressed",v==="fogo");renderAll()};
  $("#sc-hoje").onclick=()=>setScn("hoje");$("#sc-fogo").onclick=()=>setScn("fogo");
  $("#sc-hoje").setAttribute("aria-pressed",SCN==="hoje");$("#sc-fogo").setAttribute("aria-pressed",SCN==="fogo");
  ["#ly-idw","#ly-ref","#ly-pa","#ly-fire","#ly-wind"].forEach(id=>$(id).onchange=renderMaps);
  const q=$("#q"),sg=$("#sugg");
  q.oninput=()=>{const v=norm(q.value.trim());if(!v){sg.style.display="none";return}const hits=MUN.filter(m=>norm(m.n).includes(v)).slice(0,8);sg.innerHTML=hits.map(m=>{const s=munState(m.n);return `<button type="button" data-m="${m.n}"><span>${m.n}</span><span><i class="dot" style="background:${LV[s.lv].c}"></i> ${s.iqar}</span></button>`}).join("")||`<div class="small muted" style="padding:8px 12px">Nenhum município encontrado</div>`;sg.style.display="block";sg.querySelectorAll("button").forEach(b=>b.onclick=()=>{setMun(b.dataset.m);q.value="";sg.style.display="none";if(!["agora","mapa"].includes(location.hash.slice(1)))location.hash="#agora"})};
  q.onkeydown=e=>{if(e.key==="Enter"){const b=sg.querySelector("button");if(b)b.click()}if(e.key==="Escape"){sg.style.display="none"}};
  document.addEventListener("click",e=>{if(!e.target.closest(".search"))sg.style.display="none"});
  ["#a-mun","#a-lvl","#a-prof"].forEach(id=>$(id).onchange=alertPreview);
  $("#f-alert").onsubmit=e=>{e.preventDefault();const muns=[...$("#a-mun").selectedOptions].map(o=>o.value);const ch=[...$$("#a-ch input:checked")].map(i=>i.value);const ok=$("#a-ok");
    if(!ch.length){ok.style.display="block";ok.textContent="Escolha pelo menos um canal.";return}
    ok.style.display="block";ok.innerHTML=`<b>Alerta simulado.</b> ${muns.join(", ")||CUR} · ${ch.join(", ")} · a partir de ${$("#a-lvl").selectedOptions[0].text}. Neste protótipo nada é enviado; em produção, chega uma mensagem de confirmação.`};
  $$("[data-copy]").forEach(b=>b.onclick=async()=>{const txt=bulletinText(b.dataset.copy);try{await navigator.clipboard.writeText(txt);toast("Texto copiado")}catch(e){toast("Não foi possível copiar neste navegador")}});
  $$("#v-comunidade .seg button").forEach(b=>b.onclick=()=>{FILT=b.dataset.f;$$("#v-comunidade .seg button").forEach(x=>x.setAttribute("aria-pressed",x===b));renderFeed()});
  $("#f-rep").onsubmit=e=>{e.preventDefault();const txt=$("#r-txt").value.trim();if(!txt){toast("Descreva o que está vendo");$("#r-txt").focus();return}
    const tp=document.querySelector('input[name="tp"]:checked').value;const mun=$("#r-mun").value;const f=$("#r-img").files[0];
    const add=img=>{POSTS.unshift({tp,mun,who:"Você",t:"agora",txt,n:0,img,v:"Em análise. Vamos cruzar com sensores e satélite em até 30 minutos."});FILT="todos";$$("#v-comunidade .seg button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.f==="todos"));renderFeed();$("#f-rep").reset();toast("Relato publicado neste protótipo")};
    if(f){const fr=new FileReader();fr.onload=()=>add(fr.result);fr.readAsDataURL(f)}else add(null)};
  $("#adopt").onclick=e=>{e.preventDefault();toast("Em produção, abre o formulário de comodato")};
  window.addEventListener("hashchange",route);
}
/* ---------- Inicialização, acesso e modos ---------- */
let BOOTED=false;
function boot(){if(BOOTED)return;BOOTED=true;fillSelects();renderCalib();bind();renderFeed();route()}
function banner(kind,snap){
  const seg=$("#bn-seg"), t=$("#bn-t"), s=$("#bn-s");
  if(kind==="real"){
    const on=snap.estacoes.filter(e=>e.online).length; const hr=new Date(snap.atualizado).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
    t.textContent="Ambiente de desenvolvimento · dados reais."; s.textContent=`${on} de ${snap.estacoes.length} equipamentos com dados, atualizado em ${hr}. Previsão, focos de calor, alertas por mensagem e comunidade ainda são demonstração.`; seg.hidden=true;
  }else if(kind==="vazio"){
    t.textContent="Ambiente de desenvolvimento · ainda sem dados reais."; s.textContent="O coletor ainda não publicou dados válidos no Firestore. Enquanto isso, valores de demonstração:"; seg.hidden=false;
  }else{
    t.textContent="Pré-visualização local, sem login."; s.textContent="Valores de demonstração. Escolha um cenário:"; seg.hidden=false;
  }
}
function lockScreen(state,msg){
  document.body.classList.add("locked");
  $("#login").hidden=false; $("#lg-form").hidden=state==="denied"||state==="loading"; $("#lg-denied").hidden=state!=="denied"; $("#lg-loading").hidden=state!=="loading";
  $("#lg-msg").textContent=msg||""; if(state==="denied")$("#lg-denied-txt").textContent=msg||"";
  if(state==="form")setTimeout(()=>$("#lg-email").focus(),50);
}
function unlockScreen(email){document.body.classList.remove("locked");$("#login").hidden=true;$("#user").textContent=email||"";$("#user").hidden=!email;$("#logout").hidden=!email}
export const QAR={
  auth:null, // preenchido pelo módulo do Firebase: {login, reset, logout}
  local(){MODE="demo";REAL=null;boot();unlockScreen(null);banner("local");renderAll()},
  setData(snap){boot();const ok=!!snap&&(snap.estacoes||[]).some(e=>e.online&&e.medias&&e.medias["MP2,5"]!=null&&MUNBY[e.municipio]&&e.lat!=null);
    MODE=ok?"real":"demo";REAL=ok?snap:null;banner(ok?"real":"vazio",snap);renderAll()},
  lock:lockScreen, unlock:unlockScreen
};
$("#lg-form").addEventListener("submit",async e=>{e.preventDefault();const em=$("#lg-email").value.trim(),pw=$("#lg-pass").value;if(!em||!pw){$("#lg-msg").textContent="Preencha e-mail e senha.";return}
  $("#lg-btn").disabled=true;$("#lg-msg").textContent="Entrando…";try{await QAR.auth.login(em,pw);$("#lg-msg").textContent=""}catch(err){$("#lg-msg").textContent=err.message}finally{$("#lg-btn").disabled=false}});
$("#lg-reset").addEventListener("click",async()=>{const em=$("#lg-email").value.trim();if(!em){$("#lg-msg").textContent="Digite seu e-mail acima e clique de novo.";return}
  try{await QAR.auth.reset(em);$("#lg-msg").textContent="Se o e-mail estiver cadastrado, você vai receber um link para criar nova senha."}catch(err){$("#lg-msg").textContent=err.message}});
$$("[data-logout]").forEach(b=>b.addEventListener("click",()=>QAR.auth&&QAR.auth.logout()));


window.QAR=QAR;
