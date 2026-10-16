# Stride Circle: logo guidelines

## 1. The logo
- **Idea:** eight left-right steps walking one perfect circle. Walking together, round and round, every day. The blue step at the top is *today's step*.
- **Versions:** horizontal lockup (primary) · stacked lockup · symbol only · wordmark only · small-size symbol.
- **Files**

| Folder | What's in it |
|---|---|
| `symbol/` | Symbol masters: colour, on-dark, on-blue (for icon tiles), small-size cut, plus black / white / mono / square variants |
| `lockups/` | Horizontal, stacked and wordmark, each with colour, on-dark, black, white and ink-mono versions |
| `web/` | favicon.ico, favicon PNGs, apple-touch-icon, PWA icons (192/512/maskable), site.webmanifest, head snippet |
| `expo/` | `icon.svg` (full-bleed 1024), `adaptive-icon-foreground.svg`, `splash-icon.svg` and their PNGs |
| `board/` | Presentation board with mockups |

All SVGs are pure filled paths: no live text, strokes, rasters or effects.

## 2. Clear space
Keep a clear zone of **1 step** around the logo on all sides. One step is the length of one footprint (toe to heel), about a quarter of the symbol's height. The zone scales with the logo.

## 3. Minimum size
| Version | Screen | Print |
|---|---|---|
| Horizontal lockup | 120 px wide | 30 mm wide |
| Stacked lockup | 64 px wide | 18 mm wide |
| Symbol (8 steps) | 40 px | 10 mm |
| Symbol, small cut (6 steps in a blue disc) | 16–39 px | under 10 mm |

Below 40 px, always use `stride-circle-symbol-small.svg`. The eight-step loop blurs into a dotted ring at small sizes.

## 4. Colour
The logo uses the app's own palette (`appColors` in `src/design-system/tokens.ts`).

| Name | Token | Role | HEX | RGB | CMYK (approx.) |
|---|---|---|---|---|---|
| Ink | `appColors.ink` | Steps and wordmark on light; steps on the blue icon | `#173342` | 23 51 66 | 65 23 0 74 |
| Blue | `appColors.blue` | Today's step on light and dark; app icon and small-cut background | `#13B5E8` | 19 181 232 | 92 22 0 9 |
| Ice | `appColors.ice` | Steps on dark backgrounds | `#E8F8FF` | 232 248 255 | 9 3 0 0 |
| White | `palette.white` | Wordmark on dark; today's step on the blue icon | `#FFFFFF` | 255 255 255 | 0 0 0 0 |

The CMYK values are straight conversions from RGB. Get a printed proof before any large print run. No Pantone match has been chosen yet.

**Approved logo and background pairs:** ink with a blue step on white or ice · ink with a white step on blue (app icon) · ice with a blue step on ink or the dark-mode background `#111F29` · one-colour ink on light · one-colour white on dark or on photos.
Blue on white is an accent only, never the whole mark: its contrast (about 2.4:1) is too low to carry the shape alone. Ink on blue (about 5.5:1) is fine.

## 5. Typography
- **Wordmark:** Nunito Sans ExtraBold (800), lowercase, tracking −10/1000, converted to outlines. Don't retype it.
- **App UI:** Nunito Sans 400 / 600 / 800 / 900, matching the app's existing font files.
- **Licence:** SIL Open Font License. Use in logos is allowed.
- **Spacing:** the wordmark uses the font's default spacing (no kerning pass yet). A manual optical kerning pass is recommended before final print.

## 6. Don'ts
- Don't rotate the loop or change the number of steps (except the provided 6-step small cut).
- Don't recolour outside the palette, and don't use more than one highlighted step.
- Don't add shadows, outlines, gradients or effects.
- Don't stretch, squash, or rearrange or resize the parts of a lockup.
- Don't place the logo on busy photos without the white version or a blue or ink container.

## 7. Motion (recommended)
The loop is built for animation. Steps can light up one by one in walking order (clockwise from the top) for loading, sync and goal celebrations. The highlighted step can mark today's progress around the ring.

## 8. Before launch
- Trademark clearance is **not** done. Run a search (e.g. WIPO Global Brand Database, USPTO, EUIPO) and a reverse image search.
- Master files live in `app/brand/logo/kit/`. Concept rounds are in `app/brand/logo/concepts/`.
