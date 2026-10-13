export interface MaterialSettings {opacity:number;saturation:number;shadow:number;grain:number;blur:number;distortion:number;background:string;content:string;}
export const defaults: MaterialSettings;
export interface MaterialRenderer {set(settings:Partial<MaterialSettings>&{text?:string;theme?:string}):void;resetScroll():void;getCSS():string;upload(file:File):Promise<void>;destroy():void;}
export function createMaterialPreview(element:HTMLElement):MaterialRenderer;
