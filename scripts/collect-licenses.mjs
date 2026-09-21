import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
const packages=['astro','@astrojs/react','react','react-dom','scheduler','motion','framer-motion','motion-dom','motion-utils','three','gsap'];
mkdirSync('public/licenses',{recursive:true});
const index=[];
for(const name of packages){
  const dir=`node_modules/${name}`;
  const pkg=JSON.parse(readFileSync(`${dir}/package.json`,'utf8'));
  const filename=readdirSync(dir).find(name=>/^licen[sc]e(\.(md|txt))?$/i.test(name));
  const dest=`${name.replaceAll('/','-').replace('@','')}.txt`;
  const content=filename?readFileSync(`${dir}/${filename}`,'utf8'):`${name} ${pkg.version}\n${pkg.license}\nGSAP copyright and full license terms: https://gsap.com/standard-license/\nThis is a package license notice, not a replacement for the complete license.\n`;
  writeFileSync(`public/licenses/${dest}`,content);
  index.push({name,version:pkg.version,license:pkg.license,file:dest,kind:filename?'license text':'package notice; see linked full terms'});
}
writeFileSync('public/licenses/index.json',JSON.stringify(index,null,2)+'\n');
console.log(`Preserved ${index.length} package license texts / notices.`);
