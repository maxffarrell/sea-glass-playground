<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { ModeWatcher, mode, userPrefersMode, setMode, resetMode } from 'mode-watcher';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import Monitor from '@lucide/svelte/icons/monitor';
  import { Button } from '$lib/components/ui/button';
  import { Slider } from '$lib/components/ui/slider';
  import * as Select from '$lib/components/ui/select';
  import * as Tabs from '$lib/components/ui/tabs';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { createMaterialPreview, defaults, type MaterialSettings, type MaterialRenderer } from '$lib/material.js';

  let settings = $state<MaterialSettings>({...defaults});
  let text = $state('Stay curious.\nLook a little closer.');
  let status = $state('');
  let css = $state('');
  let cssDialog = $state(false);
  let previewElement: HTMLElement;
  let renderer = $state.raw<MaterialRenderer | null>(null);
  const sliders: {key:keyof Pick<MaterialSettings,'opacity'|'saturation'|'shadow'|'grain'|'blur'|'distortion'>;label:string;max:number;description:string}[] = [
    {key:'opacity',label:'Opacity',max:100,description:'Transparency of the glass. Text stays crisp.'},
    {key:'saturation',label:'Saturation',max:200,description:'Color intensity. Original tint at 100%.'},
    {key:'shadow',label:'Shadow',max:200,description:'From flat to softly floating.'},
    {key:'grain',label:'Graininess',max:100,description:'A fine, speckled surface texture.'},
    {key:'blur',label:'Blur',max:100,description:'Frost radius. Original: 47px.'},
    {key:'distortion',label:'Distortion',max:100,description:'Lens refraction. Original: 42%.'},
  ];
  const contents = [{value:'website',label:'Editorial website'},{value:'feed',label:'Social feed'},{value:'dashboard',label:'Project dashboard'},{value:'image',label:'Your image'},{value:'text',label:'Typography'},{value:'grid',label:'Grid & shapes'},{value:'poster',label:'Color poster'},{value:'none',label:'Empty'}];
  const backgrounds = [{value:'white',label:'Plain'},{value:'checker',label:'Checkerboard'},{value:'landscape',label:'Pastel'}];
  let themeChoice = $derived(userPrefersMode.current === 'system' ? 'device' : userPrefersMode.current);
  function chooseTheme(value:string) { if(value==='device') resetMode(); else setMode(value as 'light'|'dark'); }
  function reset() { settings={...defaults};renderer?.resetScroll();status='Original Figma material restored.'; }
  async function upload(event:Event) {
    const file=(event.currentTarget as HTMLInputElement).files?.[0];
    if(!file || !renderer) return;
    try {await renderer.upload(file);status='Image loaded locally.';} catch {status='This image could not be read. Try a PNG or JPEG.';}
  }
  async function copy() {
    if(!renderer) return;
    css=renderer.getCSS();
    try {await navigator.clipboard.writeText(css);status='CSS approximation copied, including the lower highlight and grain.';} catch {cssDialog=true;status='Copy the recipe from the dialog.';}
  }
  onMount(()=>{
    const query=new URLSearchParams(location.search);
    for(const {key,max} of sliders) {
      if(!query.has(key) || (key==='opacity'&&!query.has('saturation'))) continue;
      const value=Number(query.get(key));
      if(Number.isFinite(value)) settings[key]=Math.round(Math.max(0,Math.min(max,value)));
    }
    if(contents.some(c=>c.value===query.get('content'))) settings.content=query.get('content')!;
    if(backgrounds.some(c=>c.value===query.get('background'))) settings.background=query.get('background')!;
    renderer=createMaterialPreview(previewElement);
    return ()=>renderer?.destroy();
  });
  $effect(()=>{
    const current={...settings,text,theme:mode.current??'light'};
    if(!renderer) return;
    untrack(()=>renderer?.set(current));
    const query=new URLSearchParams(Object.entries(settings).map(([key,value])=>[key,String(value)]));
    history.replaceState(null,'',`${location.pathname}?${query}`);
  });
</script>

<ModeWatcher defaultMode="system" />
<main>
  <header class="header">
    <div class="brand"><span class="brand-icon" aria-hidden="true"></span><span>Material studies <span class="slash">/</span> <strong>Sea glass</strong></span></div>
    <div class="header-tools">
      <Tabs.Root value={themeChoice} onValueChange={chooseTheme}>
        <Tabs.List aria-label="Theme" class="theme-toggle" style={`--active-tab:${themeChoice==='light'?0:themeChoice==='dark'?1:2}`}>
          <span class="theme-indicator" aria-hidden="true"></span>
          <Tabs.Trigger value="light" aria-label="Light theme"><Sun size={14}/><span>Light</span></Tabs.Trigger>
          <Tabs.Trigger value="dark" aria-label="Dark theme"><Moon size={14}/><span>Dark</span></Tabs.Trigger>
          <Tabs.Trigger value="device" aria-label="Device theme"><Monitor size={14}/><span>Device</span></Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
      <a class="reference-link" href="https://www.figma.com/design/pFyVcyPmUvIvOmTVrfVOET/Google-Sea-Glass--Community-?node-id=1-2" target="_blank" rel="noreferrer">Figma reference ↗</a>
    </div>
  </header>
  <div class="workspace">
    <aside class="controls" aria-label="Material controls">
      <div class="intro"><div class="eyebrow">THE PLAYGROUND</div><h1>A little light.<br /> A little texture.</h1><p>Shape the soft, frosted material.<br /> Every change happens live.</p></div>
      <div class="sliders">
        {#each sliders as slider (slider.key)}
          <div class="control">
            <div class="control-heading"><span class="slider-label">{slider.label}</span><output>{settings[slider.key]}{slider.key==='blur'?'px':'%'}</output></div>
            <Slider type="single" bind:value={settings[slider.key]} max={slider.max} step={1} aria-label={slider.label} class="material-slider" onValueChange={()=>status=''} />
            <p>{slider.description}</p>
          </div>
        {/each}
      </div>
      <fieldset class="background-controls"><legend>Preview background</legend><div class="backgrounds">
        {#each backgrounds as background (background.value)}<button type="button" class="swatch {background.value}" aria-label={`${background.label} background`} aria-pressed={settings.background===background.value} onclick={()=>settings.background=background.value}></button>{/each}
        <span class="background-name">{backgrounds.find(b=>b.value===settings.background)?.label}</span>
      </div></fieldset>
      <div class="content-controls">
        <Label for="content-trigger">Content beneath the glass</Label>
        <Select.Root type="single" bind:value={settings.content}>
          <Select.Trigger id="content-trigger" class="content-select">{contents.find(c=>c.value===settings.content)?.label}</Select.Trigger>
          <Select.Content>{#each contents as content (content.value)}<Select.Item value={content.value} label={content.label}>{content.label}</Select.Item>{/each}</Select.Content>
        </Select.Root>
        {#if settings.content==='text'}<Label for="preview-text">Preview text</Label><Textarea id="preview-text" bind:value={text} rows={2}/>{/if}
        {#if settings.content==='image'}<Label for="image-upload">Choose an image</Label><input id="image-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onchange={upload}/><p class="material-note">Your image stays in this browser.</p>{/if}
        <p class="material-note">Scroll inside the preview. The glass stays in place as content moves beneath it.</p>
      </div>
      <div class="actions"><Button variant="outline" onclick={reset}>Reset to Figma</Button><Button onclick={copy}>Copy CSS ↗</Button></div>
      <p class="note">Based on Google Sea Glass. Glass refraction is approximated for the web.</p>
      <p class="status" role="status" aria-live="polite">{status}</p>
    </aside>
    <section class="preview-panel" aria-label="Live sea glass preview" bind:this={previewElement}>
      <div class="preview-header"><span><span class="live-dot"></span>LIVE PREVIEW</span><span>01 / Material</span></div>
      <div class="stage" data-background={settings.background}><div class="artboard">
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable region must accept keyboard scrolling.) -->
        <div class="underlay scene" role="region" aria-label="Scrollable preview content" tabindex="0"></div>
        <div class="surface google"><img src="/assets/sparkle.svg" alt="Sparkle" width="56" height="58" /></div>
        <div class="surface photos-bar"><div class="selected"><img src="/assets/photos.svg" alt="" width="38" height="38"/><span>Photos</span></div><span class="collections">Collections</span><span class="create">Create</span></div>
        <div class="surface gemini"><img class="plus" src="/assets/plus.svg" alt="" width="38" height="38"/><span class="ask">Ask Gemini</span><img class="mic" src="/assets/mic.svg" alt="" width="38" height="38"/><div class="voice"><img src="/assets/voice.svg" alt="" width="38" height="38"/></div></div>
      </div></div>
      <div class="preview-footer"><span>Scroll beneath the glass ↓</span><span class="recipe">Blur {settings.blur}px · Refraction {settings.distortion}%</span></div>
    </section>
  </div>
  <footer class="page-footer"><span>SEA GLASS EXPLORATIONS</span><span>Move a slider. Find your finish.</span></footer>
</main>
<Dialog.Root bind:open={cssDialog}><Dialog.Content class="sm:max-w-xl"><Dialog.Header><Dialog.Title>Your material CSS</Dialog.Title><Dialog.Description>The CSS recipe includes grain and lower highlights. Refraction and adaptive contrast also require the renderer modules.</Dialog.Description></Dialog.Header><Textarea readonly value={css} aria-label="Generated material CSS" class="h-80 font-mono text-xs"/></Dialog.Content></Dialog.Root>
