export const defaults = { opacity: 100, saturation: 100, shadow: 100, grain: 35, blur: 47, distortion: 42, background: 'white', content: 'website' };
export function createMaterialPreview(element) {
const state={...defaults,text:'Stay curious.\nLook a little closer.',theme:'light'};
const stage=element.querySelector('.stage');
const artboard=element.querySelector('.artboard');
let uploadedImageURL = '';
let previousScene = '';
const SVG_NS = 'http://www.w3.org/2000/svg';
const filterDefinitions = document.createElementNS(SVG_NS, 'svg');
filterDefinitions.classList.add('filter-definitions');
filterDefinitions.setAttribute('aria-hidden', 'true');
const defs = document.createElementNS(SVG_NS, 'defs');
filterDefinitions.append(defs);
element.append(filterDefinitions);
function svgElement(tag, attributes) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}
// Approximate the source's 47px frost radius, 0.42 refraction, and 23px depth.
// Figma's frost radius is represented as a Gaussian sigma of radius / 2.
// The signed capsule normal bends the sampled scene near the lens edge.
for (const [name, width, height, x, y] of [['google',105,104,403,126],['photos-bar',563,104,174,309],['gemini',637,104,137,492]]) {
  const map = document.createElement('canvas');
  map.width = width; map.height = height;
  const context = map.getContext('2d');
  const pixels = context.createImageData(width, height);
  const radius = height / 2;
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const dx = px + .5 - Math.max(radius, Math.min(width - radius, px + .5));
    const dy = py + .5 - radius;
    const length = Math.hypot(dx, dy);
    const depth = Math.max(0, Math.min(1, (radius - length) / 23));
    const bend = length && depth > 0 ? Math.sin(depth * Math.PI) : 0;
    const offset = (py * width + px) * 4;
    pixels.data[offset] = Math.round(127.5 - (length ? dx / length : 0) * bend * 127.5);
    pixels.data[offset + 1] = Math.round(127.5 - (length ? dy / length : 0) * bend * 127.5);
    pixels.data[offset + 2] = 128; pixels.data[offset + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const filter = svgElement('filter', {id:`lens-${name}`, x:0, y:0, width, height, filterUnits:'userSpaceOnUse', primitiveUnits:'userSpaceOnUse', 'color-interpolation-filters':'sRGB'});
  filter.append(svgElement('feGaussianBlur', {in:'SourceGraphic',stdDeviation:47 / 2,result:'soft-scene'}));
  filter.append(svgElement('feImage', {href:map.toDataURL(),x:0,y:0,width,height,result:'lens-map'}));
  filter.append(svgElement('feDisplacementMap', {in:'soft-scene',in2:'lens-map',scale:2 * .42 * 23,xChannelSelector:'R',yChannelSelector:'G'}));
  defs.append(filter);
  const lens = document.createElement('div');
  lens.className = 'refraction'; lens.setAttribute('aria-hidden', 'true');
  const sample = document.createElement('div'); sample.className = 'lens-sample'; sample.style.filter = `url(#lens-${name})`;
  const scene = document.createElement('div'); scene.className = 'scene'; scene.style.left = `${-x}px`; scene.style.top = `${-y}px`;
  sample.append(scene); lens.append(sample); element.querySelector(`.surface.${name}`).prepend(lens);
}
function updateContent() {
  const sceneKey = JSON.stringify([state.content,state.background,state.theme,state.text,uploadedImageURL]);
  if (sceneKey === previousScene) return;
  previousScene = sceneKey;
  const scene = element.querySelector('.underlay');
  const previousScroll=scene.dataset.content===state.content?scene.scrollTop:0;
  scene.dataset.content=state.content;
  scene.dataset.background = state.background;
  scene.dataset.theme = state.theme;
  scene.replaceChildren();
  scene.scrollTop = 0;
  function add(className, text, parent = scene) { const node = document.createElement('div'); node.className = className; if (text) node.textContent = text; parent.append(node); return node; }
  if (state.content === 'website') {
    const page = add('sample-page editorial');
    add('sample-nav','FIELDNOTES     /     Stories     Design     Places',page);
    add('sample-kicker','IDEAS FOR EVERYDAY LIVING · ISSUE 08',page);
    add('sample-heading','Find beauty in\nthe ordinary.',page);
    add('sample-lede','A journal about thoughtful spaces, small rituals, and the people making things with care.',page);
    const hero = add('editorial-art', '',page); add('art-sun','',hero); add('art-vase','',hero); add('art-caption','THE ART OF SLOWER DAYS',hero);
    add('sample-section-title','A fresh perspective',page);
    add('sample-body','A room changes with the light. A familiar route reveals something new. Sometimes all it takes is a moment to notice what has been there all along.',page);
    const stories = add('story-grid','',page);
    for (const [title,tag] of [['Spaces to breathe','AT HOME'],['Objects with a story','DESIGN'],['The long way home','TRAVEL'],['The morning ritual','LIVING']]) { const card=add('story-card','',stories); add('story-art','',card); add('sample-kicker',tag,card); add('story-title',title,card); add('sample-body','A closer look at the details that make everyday life feel a little richer.',card); }
    add('sample-section-title','Make room for inspiration.',page); add('sample-body','New stories, fresh ideas, and thoughtful discoveries. Come back whenever you need a different view.',page); add('sample-nav','FIELDNOTES     /     A journal for the curious',page);
  }
  if (state.content === 'feed') {
    const page=add('sample-page social',''); add('sample-nav','Gather     /     Following     Discover     Saved',page); add('sample-heading','Your daily\ndose of good.',page);
    for (const [name,location,caption] of [['Maya Chen','Lisbon, Portugal','The best mornings start without a plan.'],['Alex Rivera','Joshua Tree, California','Somewhere between the sky and the quiet.'],['Studio Fern','Portland, Oregon','A few things we have been working on lately.'],['Jamie Park','Copenhagen, Denmark','Taking the scenic route, always.']]) { const post=add('feed-post','',page); const byline=add('post-byline','',post); add('avatar',name[0],byline); const person=add('','',byline); add('person-name',name,person); add('person-location',location,person); add('feed-art','',post); add('post-actions','♡     ◇     ↗                                     ⌑',post); add('sample-body',caption,post); add('person-location','View all comments · 2 hours ago',post); }
  }
  if (state.content === 'dashboard') {
    const page=add('sample-page dashboard',''); add('sample-nav','Orbit     /     Overview     Projects     Team',page); add('sample-kicker','MONDAY, OCTOBER 12',page); add('sample-heading','Good morning,\nAlex.',page); add('sample-lede','Here is what is happening across your workspace.',page);
    const stats=add('stats-grid','',page); for(const [value,label] of [['12','Active projects'],['34','Tasks completed'],['86%','On schedule']]){const stat=add('stat-card','',stats);add('stat-value',value,stat);add('sample-body',label,stat);}
    const chart=add('chart-panel','',page);add('sample-section-title','Team activity',chart);const bars=add('chart-bars','',chart);[40,62,48,82,57,95,72,88,64,100,79,92].forEach(height=>{const bar=add('chart-bar','',bars);bar.style.height=`${height}%`;});add('person-location','JAN     FEB     MAR     APR     MAY     JUN',chart);
    add('sample-section-title','Your projects',page);for(const [name,progress]of [['Website refresh',72],['Mobile experience',48],['Design system',89],['Customer research',35],['Autumn campaign',60]]){const project=add('project-row','',page);add('story-title',name,project);add('person-location',`${progress}% complete · Updated today`,project);const track=add('project-track','',project);const fill=add('project-fill','',track);fill.style.width=`${progress}%`;}
    add('sample-section-title','Recent activity',page);for(const activity of ['Maya shared new concepts for the homepage.','Alex completed the accessibility review.','Jamie added 8 new components to the library.','The team wrapped up this week’s planning.'])add('activity-row',activity,page);
  }
  if (state.content === 'text') { add('scene-text', state.text); add('scene-caption','A study in light, color, and texture.'); }
  if (state.content === 'grid') { add('scene-lines'); add('scene-circle'); add('scene-square'); }
  if (state.content === 'poster') { const poster = add('scene-poster'); add('poster-orb','',poster); add('poster-title','Fresh\nperspective.',poster).style.whiteSpace = 'pre-line'; add('poster-label','SEE THINGS DIFFERENTLY',poster); }
  if (state.content === 'image') {
    if (uploadedImageURL) { const image = document.createElement('img'); image.className = 'scene-image'; image.src = uploadedImageURL; image.alt = ''; scene.append(image); }
    else add('image-placeholder','Choose an image to place beneath the glass.');
  }
  element.querySelectorAll('.refraction .scene').forEach(copy => { copy.dataset.background = state.background; copy.dataset.theme=state.theme; copy.replaceChildren(...[...scene.children].map(node => node.cloneNode(true))); copy.scrollTop=previousScroll; });
  scene.scrollTop=previousScroll;
}
const underlay = element.querySelector('.underlay');
const syncScroll = () => { element.querySelectorAll('.refraction .scene').forEach(copy => { copy.scrollTop = underlay.scrollTop; }); };
underlay.addEventListener('scroll', syncScroll, {passive:true});
// Stable noise prevents distracting flicker while moving the sliders.
let seed = 74321;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const samples = Array.from({ length: 256 * 256 }, () => [random(), random() > .5]);
const canvas = document.createElement('canvas');
canvas.width = canvas.height = 256;
const ctx = canvas.getContext('2d');
let noiseURL = '';
let previousGrain = -1;
function updateNoise() {
  if (previousGrain === state.grain) return;
  previousGrain = state.grain;
  const pixels = ctx.createImageData(256, 256);
  samples.forEach(([density, light], i) => {
    const offset = i * 4;
    pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = light ? 255 : 0;
    pixels.data[offset + 3] = density < state.grain / 100 ? Math.round((light ? .3 : .1) * 255) : 0;
  });
  ctx.putImageData(pixels, 0, 0);
  noiseURL = canvas.toDataURL('image/png');
  element.style.setProperty('--grain-image', state.grain ? `url("${noiseURL}")` : 'none');
}
function update() {
  defs.querySelectorAll('feGaussianBlur').forEach(node => node.setAttribute('stdDeviation',state.blur / 2));
  defs.querySelectorAll('feDisplacementMap').forEach(node => node.setAttribute('scale',2 * state.distortion / 100 * 23));
  const s = state.shadow / 100;
  const opacity = state.opacity / 100;
  element.style.setProperty('--glass-opacity', opacity);
  element.style.setProperty('--tint-opacity', .33);
  for (const [name,tint,glow] of [['google',[255,0,0],[255,198,198]],['photos-bar',[191.25,0,255],[241,198,255]],['gemini',[0,68,255],[198,214,255]]]) {
    const surface=element.querySelector(`.surface.${name}`);
    surface.style.setProperty('--tint',saturateColor(tint));
    surface.style.setProperty('--glow',saturateColor(glow));
  }
  element.style.setProperty('--shadow-y', `${22 * s}px`);
  element.style.setProperty('--shadow-blur', `${3.3 * s}px`);
  element.style.setProperty('--shadow-alpha', .15 * Math.min(s, 1.6) * opacity);
  element.style.setProperty('--glow-y', `${29 * s}px`);
  element.style.setProperty('--glow-blur', `${8.9 * s}px`);
  element.style.setProperty('--glow-spread', `${-20 * s}px`);
  element.style.setProperty('--glow-alpha', .7 * Math.min(s, 1) * opacity);
  updateNoise();
  updateContent();
}
function saturateColor(channels) {
  const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  return channels.map(channel=>Math.max(0,Math.min(255,luminance+(channel-luminance)*state.saturation/100)).toFixed(2)).join(',');
}
function getCSS() {
  const s = state.shadow / 100;
  const opacity=state.opacity/100;
  return `/* Sea glass: opacity ${state.opacity}%, saturation ${state.saturation}%, shadow ${state.shadow}%, grain ${state.grain}%, blur ${state.blur}px, distortion ${state.distortion}%.
 * The live preview also refracts a clipped duplicate of the content behind it.
 * Refraction setup for the 563x104 Photos capsule at (174,309):
 * 1. Add the SVG below once to your page (hidden with width:0;height:0).
 * 2. Inside .sea-glass, add .refraction > .lens-sample > .scene.
 * 3. Duplicate your 912x722 backdrop content into .scene.
 * 4. Use the additional CSS at the end of this recipe.
 * 5. When your backdrop scrolls, synchronize its scrollTop with each .refraction .scene.
 * SVG: ${filterDefinitions.outerHTML}
 */
.sea-glass {
  --tint: ${saturateColor([191.25,0,255])}; /* source purple, with current saturation */
  --glow: ${saturateColor([241,198,255])};
  --glass-opacity: ${opacity};
  position: relative;
  isolation: isolate;
  border-radius: 97px;
  background: linear-gradient(rgba(255,255,255,.15), rgba(255,255,255,.11)),
    linear-gradient(rgba(var(--tint),.33), rgba(var(--tint),.33)),
    rgba(255,255,255,.25);
  backdrop-filter: blur(${state.blur / 2}px);
  -webkit-backdrop-filter: blur(${state.blur / 2}px);
  box-shadow: inset 0 -21px 31.1px -7px rgba(255,255,255,.17),
    inset 0 5px 5px rgba(var(--tint),.07),
    inset 0 20px 29.4px rgba(255,255,255,.25),
    0 ${(22 * s).toFixed(2)}px ${(3.3 * s).toFixed(2)}px rgba(0,0,0,${(.15 * Math.min(s, 1.6) * opacity).toFixed(3)}),
    0 ${(29 * s).toFixed(2)}px ${(8.9 * s).toFixed(2)}px ${(-20 * s).toFixed(2)}px rgba(var(--glow),${(.7 * Math.min(s, 1) * opacity).toFixed(3)});
}
.sea-glass::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  opacity:var(--glass-opacity);
  background-image: ${state.grain ? `url("${noiseURL}")` : 'none'};
  background-size: 256px 256px;
}
.sea-glass > * { position: relative; z-index: 1; }
/* Optional full refraction composition (matches the live playground). */
.sea-glass {
  width:563px; height:104px; background:none;
  backdrop-filter:none; -webkit-backdrop-filter:none;
  box-shadow:0 ${(22*s).toFixed(2)}px ${(3.3*s).toFixed(2)}px rgba(0,0,0,${(.15*Math.min(s,1.6)*opacity).toFixed(3)}),
    0 ${(29*s).toFixed(2)}px ${(8.9*s).toFixed(2)}px ${(-20*s).toFixed(2)}px rgba(var(--glow),${(.7*Math.min(s,1)*opacity).toFixed(3)});
}
.sea-glass::before {
  content:""; position:absolute; inset:0; border-radius:inherit; z-index:-1; opacity:var(--glass-opacity);
  background:linear-gradient(rgba(255,255,255,.15),rgba(255,255,255,.11)),
    linear-gradient(rgba(var(--tint),.33),rgba(var(--tint),.33)),rgba(255,255,255,.25);
  box-shadow:inset 0 -21px 31.1px -7px #ffffff2b,inset 0 5px 5px rgba(var(--tint),.07),inset 0 20px 29.4px #ffffff40;
}
.sea-glass > .refraction { position:absolute; inset:0; border-radius:inherit; overflow:hidden; z-index:-2; pointer-events:none; opacity:var(--glass-opacity); }
.sea-glass .lens-sample { position:absolute; inset:0; filter:url(#lens-photos-bar); }
.sea-glass .scene { position:absolute; width:912px; height:722px; left:-174px; top:-309px; }
`;
}
const observer = new ResizeObserver(() => { artboard.style.transform = `scale(${stage.clientWidth / 912})`; });
observer.observe(stage);
update();
return {
  set(settings) { Object.assign(state,settings); update(); },
  resetScroll() { underlay.scrollTop=0; syncScroll(); },
  getCSS,
  async upload(file) {
    const url=URL.createObjectURL(file); const image=new Image(); image.src=url;
    try { await image.decode(); if(uploadedImageURL) URL.revokeObjectURL(uploadedImageURL); uploadedImageURL=url; previousScene=''; update(); }
    catch(error) { URL.revokeObjectURL(url); throw error; }
  },
  destroy() { observer.disconnect(); underlay.removeEventListener('scroll',syncScroll); filterDefinitions.remove(); if(uploadedImageURL) URL.revokeObjectURL(uploadedImageURL); element.querySelectorAll('.refraction').forEach(node=>node.remove()); }
};
}
