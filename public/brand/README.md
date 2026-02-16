# PHONESPOT — Brand Assets

## Folder Structure

```
phonespot-assets/
├── phonespot-tokens.css          ← CSS variables, font imports, pattern classes
├── logos/
│   ├── phonespot-wordmark-dark.svg    ← Dark charcoal on transparent
│   ├── phonespot-wordmark-white.svg   ← White on transparent
│   └── phonespot-wordmark-green.svg   ← Eco green on transparent
├── favicons/
│   ├── favicon-dark.svg               ← Charcoal bg, white P
│   ├── favicon-light.svg              ← White bg, charcoal P
│   └── favicon-green.svg              ← Green bg, white P
└── patterns/
    ├── pattern-dotgrid-green.svg      ← Tileable 24x24 dot grid (green bg)
    ├── pattern-dotgrid-dark.svg       ← Tileable 24x24 dot grid (dark bg)
    ├── pattern-p-watermark-dark.svg   ← Large P watermark (dark bg)
    ├── pattern-p-watermark-light.svg  ← Large P watermark (light bg)
    ├── pattern-diagonal-wordmark.svg  ← Tileable diagonal PHONESPOT text
    └── pattern-scanlines.svg          ← Tileable 12x12 horizontal lines
```

## Quick Setup

1. Add font import to `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;1,800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
```

2. Import `phonespot-tokens.css` into your stylesheet.

3. Use the logo class:
```html
<span class="ps-logo ps-logo--dark">PHONESPOT</span>
```

4. Use patterns as CSS backgrounds or inline SVG tiles.

## Brand Specs

| Property         | Value                              |
|------------------|------------------------------------|
| Primary Font     | Barlow Condensed 800 Italic        |
| Body Font        | DM Sans 300/400/500/600            |
| Logo Skew        | -6deg                              |
| Logo Spacing     | 2px letter-spacing                 |
| Primary Color    | #3a3d38 (Charcoal)                 |
| Eco Accent       | #5a8c6f (Green)                    |
| Background       | #f5f2ec (Warm White)               |
| Favicon Radius   | 18.75% (96px on 512)               |
| Min Logo Width   | 120px digital / 25mm print         |
| Clear Space      | Height of the letter "P"           |

## Notes for Developer

- SVG logos use Google Fonts via @import — for production, consider converting to outlined paths
- Dot grid and scanline SVGs are designed to tile seamlessly via `background-repeat: repeat`
- P watermark SVGs are standalone (not tileable) — use as centered background-image
- Favicon SVGs can be converted to .ico / .png via any converter for browser compatibility
- All patterns are also available as pure CSS in phonespot-tokens.css
