import fs from 'fs';
const TOKEN=process.argv[2], SP=process.argv[3];
const cmd=async(op,args)=>{const r=await fetch('http://127.0.0.1:9981/',{method:'POST',headers:{'Authorization':TOKEN,'Content-Type':'application/json'},body:JSON.stringify({id:'s',op,args})});return r.json();};
const py=(code)=>cmd('run_python',{allow_python:true,code});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cfg=(feed,t,du,dv)=>[
 "P=op('/td_mcp/sandbox/panel'); m=op('/td_mcp/sandbox/panel/rdlib').module",
 `P.op('feed_slider').par.value0=${feed}`,`P.op('kill_slider').par.value0=${t}`,
 `P.op('du_slider').par.value0=${du}`,`P.op('dv_slider').par.value0=${dv}`,
 "m.rebuild(); m.reseed()",
 "import re; sh=op('/td_mcp/sandbox/rd_shader').text",
 "result=re.search(r'feed = ([0-9.]+)',sh).group(1)+'/'+re.search(r'kill = ([0-9.]+)',sh).group(1)"
].join("\n");
const preset=(n)=>["m=op('/td_mcp/sandbox/panel/rdlib').module","m.apply_preset('"+n+"')","import re; sh=op('/td_mcp/sandbox/rd_shader').text","result=re.search(r'feed = ([0-9.]+)',sh).group(1)+'/'+re.search(r'kill = ([0-9.]+)',sh).group(1)"].join("\n");
const tests=[
 ['preset:coral',preset('coral')],['preset:worms',preset('worms')],['preset:germs',preset('germs')],
 ['preset:maze',preset('maze')],['preset:spots',preset('spots')],['preset:chaos',preset('chaos')],
 ['feed_MIN',cfg(0.022,0.5,0.20,0.10)],['feed_MAX',cfg(0.062,0.5,0.20,0.10)],
 ['kill_MIN',cfg(0.0545,0.0,0.20,0.10)],['kill_MAX',cfg(0.0545,1.0,0.20,0.10)],
 ['du_MIN',cfg(0.0545,0.5,0.16,0.10)],['du_MAX',cfg(0.0545,0.5,0.24,0.10)],
 ['dv_MIN',cfg(0.0545,0.5,0.20,0.08)],['dv_MAX',cfg(0.0545,0.5,0.20,0.12)],
];
const rows=[];
for(const [name,code] of tests){
  const fk=(await py(code)).result?.result||'?';
  await sleep(10000);
  const s=(await py(["import numpy as np","v=op('/td_mcp/sandbox/null_state').numpyArray()[:,:,1]","result={'fa':round(float((v>0.1).mean()),3),'std':round(float(v.std()),3)}"].join("\n"))).result?.result||{};
  const alive = (s.fa>0.03 && s.std>0.05);
  rows.push({name,fk,...s,verdict:alive?'ALIVE':'CHECK'});
  console.log(name.padEnd(13),'f/k='+String(fk).padEnd(16),'active='+String(s.fa).padEnd(6),'std='+String(s.std).padEnd(6), alive?'ALIVE':'*** CHECK ***');
}
fs.writeFileSync(SP+'/sweep2.json',JSON.stringify(rows,null,1));
console.log('\nFLAGGED:', rows.filter(r=>r.verdict!=='ALIVE').map(r=>r.name).join(', ')||'NONE — all alive');
