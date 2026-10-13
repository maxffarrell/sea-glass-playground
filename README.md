# Sea Glass Playground

A Svelte 5 + Vite single-page material playground using shadcn-svelte controls and Tailwind CSS. Includes Light, Dark, and Device themes via mode-watcher, with saved theme preference and live device-theme updates.

## Run

```sh
npm install
npm run dev
```

```sh
npm run check
npm run build
npm run preview
```

## Material defaults

- Opacity: 100% of the original material (foreground labels stay crisp)
- Saturation: 100% of source colors; tint fill alpha remains 33%
- Shadow: 100% of the two original exterior shadows
- Grain: 35% density
- Blur: 47px frost radius (web approximation uses 23.5px Gaussian sigma)
- Distortion: 42% refraction, with the original 23px depth
- Roundedness: original 97px glass corner radius, 107px nested highlight radius, and Google Sans Flex `ROND=100` for glass labels

Scrollable editorial, social, and dashboard presets pass beneath fixed glass surfaces. Uploaded images remain local to the browser. Settings persist in the URL; Reset to Figma restores the material recipe. Copy CSS includes grain and lens-filter markup.

The SVG-filter renderer approximates Figma frost/refraction and does not exactly reproduce its dispersion or blend-mode engine. The generic sparkle replaces the original G logo. Remaining interface icons come from the supplied Figma community file. Google Sans Flex is self-hosted under the SIL Open Font License, included at `public/fonts/OFL.txt`.

## Deployment

The Vercel configuration builds a static Vite SPA. The GitHub repository is private; repository visibility does not itself restrict access to a hosted deployment. Vercel deployment access follows the project's configured protection.
