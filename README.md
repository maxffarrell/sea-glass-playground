# Sea Glass Playground

A Svelte 5 + Vite single-page material playground using shadcn-svelte controls and Tailwind CSS. Includes Light, Dark, and Device themes via mode-watcher, with saved theme preference and live device-theme updates.

## Run

```sh
npm install
npm run dev
```

```sh
npm run check
npm test
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
- Roundedness: original 97px glass radius and 107px nested highlight radius, clamped to their effective 52px and 40px capsule radii, and Google Sans Flex `ROND=100` for glass labels

Scrollable editorial, social, and dashboard presets pass beneath fixed glass surfaces. Uploaded images remain local to the browser. Settings persist in the URL; Reset to Figma restores the material recipe. Copy CSS includes grain and lens-filter markup.

The SVG-filter renderer approximates Figma frost/refraction and does not exactly reproduce its dispersion or blend-mode engine. The generic sparkle replaces the original G logo. Remaining interface icons come from the supplied Figma community file. Google Sans Flex is self-hosted under the SIL Open Font License, included at `public/fonts/OFL.txt`.

## Deployment

The Vercel configuration builds a static Vite SPA. The GitHub repository is public. Vercel deployment access follows the project's configured protection.

## Adaptive contrast

Labels and original SVG icon silhouettes adapt independently to the content beneath them, including uploaded images. A local canvas paints computed preset backgrounds, gradients, images, and approximate text layout once when content or theme changes. Scroll frames sample this cached backdrop at each foreground element, average neighborhoods according to the frost radius, and composite the current tint, opacity, and inset coating. Relative sRGB luminance chooses source-colored dark or light foregrounds, with neutral fallbacks when needed. A 15% hysteresis band avoids polarity flicker; dark backdrop regions also receive a darker coating. Light, empty backgrounds retain the source material colors.

This approximates Apple's adaptive material behavior; it is not Apple's Liquid Glass algorithm. Sampling approximates CSS gradient geometry and text wrapping, and excludes exact SVG displacement, shadows, and grain, so reported contrast estimates are not a WCAG certification. Copy CSS includes material geometry; the adaptive behavior additionally requires the `contrast.js` and `backdrop.js` modules.
