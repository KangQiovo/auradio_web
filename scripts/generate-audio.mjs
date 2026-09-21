import {mkdirSync,writeFileSync} from 'node:fs';
// Original, deterministic synthesized studies. No recordings or copyrighted songs.
// PCM mono WAV works without codecs or network services; audio begins only after a user gesture.
mkdirSync('public/audio',{recursive:true});
const rate=22050, seconds=24, count=rate*seconds;
const presets=[
  ['daylight',[130.8128,164.8138,195.9977,261.6256],1.6],
  ['closer',[146.8324,174.6141,220,293.6648],0.75],
  ['midnight',[110,130.8128,164.8138,220],1.2],
];
for(const [id,notes,beat] of presets){
  const buffer=Buffer.alloc(44+count*2);
  buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVE',8);buffer.write('fmt ',12);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++){
    const t=i/rate, step=Math.floor(t/beat), local=t%beat;
    const note=notes[step%notes.length];
    const pluck=(Math.sin(2*Math.PI*note*t)+0.25*Math.sin(4*Math.PI*note*t))*Math.exp(-local*3.3)*Math.min(1,local/0.016);
    const pad=notes.reduce((sum,f)=>sum+Math.sin(2*Math.PI*f*0.5*t),0)/notes.length;
    const pulse=Math.sin(2*Math.PI*54*t)*Math.exp(-(t%1.5)*16);
    const fade=Math.min(1,t/0.7,(seconds-t)/1.4);
    const sample=(pluck*0.27+pad*0.08+pulse*(id==='midnight'?0.14:0.04))*Math.max(0,fade);
    buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+i*2);
  }
  writeFileSync(`public/audio/${id}.wav`,buffer);
}
console.log('Generated 3 original 24-second PCM listening studies.');
