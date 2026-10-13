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

Scrollable editorial, social, and dashboard presets pass beneath fixed glass surfaces. Uploaded images remain local to the browser. Settings persist in the URL; Reset to Figma restores the material recipe. Copy CSS provides an approximate finish with grain and the lower highlight; the full lens and adaptive foreground require the renderer modules.

The canvas renderer approximates Figma frost/refraction, including a bright curved lower caustic, and does not exactly reproduce its dispersion or blend-mode engine. Grain retains the source 35% density, with faint 2px speckles calibrated against the Figma render. The generic sparkle replaces the original G logo. Remaining interface icons come from the supplied Figma community file. Google Sans Flex is self-hosted under the SIL Open Font License, included at `public/fonts/OFL.txt`.

## Deployment

The Vercel configuration builds a static Vite SPA. The GitHub repository is public. Vercel deployment access follows the project's configured protection.

## Adaptive contrast

Labels and original SVG icon silhouettes adapt independently to the content beneath them, including uploaded images. A local canvas paints computed preset backgrounds, gradients, images, and approximate text layout when content or theme changes. A software Gaussian approximation and capsule-normal displacement create the frost and refraction in `glass.js`. The same finished pixel buffer includes tint, bright lower caustics, inset highlights, opacity, and faint grain.

Relative sRGB luminance chooses source-colored dark or light foregrounds over the actual glyph/icon bounds. Where neither foreground clears the 4.5:1 target across mixed pixels, a feathered local material adjustment raises the sampled minimum to 4.7:1. Hysteresis never retains a failing color. After painting, the renderer audits quantized canvas pixels against the effective CSS foreground, and repeats on scroll, settings, theme, image, resize, and font load. Foreground changes are immediate, so a color transition cannot briefly pass through unreadable gray. Light, empty backgrounds retain the source material colors without contrast protection.

This is a web approximation of Apple's adaptive material behavior. The backdrop painter approximates CSS gradients and text layout; the contrast audit covers the material pixel buffer, not every anti-aliased edge in the browser screenshot. Copy CSS includes the approximate finish; full refraction and adaptive contrast additionally require `glass.js`, `contrast.js`, and `backdrop.js`.
