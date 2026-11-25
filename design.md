# BEN F — Website Design

The site should feel like walking through a small gallery: quiet walls, generous space, one piece at a time,
with a wall label beside each work. Buying should be obvious and take three short steps.

Audience: friends and family who want to see the work and support it by buying.
Built from the BEN F brand guide (marks, colors, Barlow), adjusted where the web needs it.

---

## 1. Color

The brand colors are the base. Two darker and one lighter tone are added so that small text
meets WCAG AA contrast (4.5:1). The brand's Clay and Stone are too light for body text on Cream.

| Token | Hex | Source | Use |
|---|---|---|---|
| `--ink` | `#1E1B18` | Brand: Ink | Body text, headings, primary buttons |
| `--cream` | `#F3ECE2` | Brand: Cream | Page "wall" background |
| `--paper` | `#FBF8F3` | Added | Raised surfaces: cards, plinths, dialogs |
| `--kiln` | `#3A2F28` | Brand: Kiln | Dark rooms: hero, commission band, footer |
| `--clay` | `#B5784F` | Brand: Clay | Large accents only (rules, dots, active marks) |
| `--clay-deep` | `#8A4F2B` | Added (darker Clay) | Small accent text and links on light backgrounds (5.5:1 on Cream) |
| `--clay-light` | `#D9A27C` | Added (lighter Clay) | Small accent text on Kiln (5.8:1) |
| `--stone` | `#8C8279` | Brand: Stone | Hairlines and borders only |
| `--stone-deep` | `#5F5750` | Added (darker Stone) | Secondary text: captions, label metadata (6.0:1 on Cream) |

Contrast checks: Ink on Cream is 14.5:1. Cream on Kiln is 10.9:1.

Rules:
- Light rooms use Cream walls with Ink text. Dark rooms use Kiln walls with Cream text. Never put mid-tone text on a mid-tone background.
- Gradients appear only in pottery placeholder shading. There are no decorative or purple/blue gradients anywhere.
- Logos are always one solid color: Ink, Cream or Clay, as the brand guide requires.

## 2. Typography

| Role | Font | Why |
|---|---|---|
| Headings / display | **Instrument Serif** (Google Fonts) | A tall, sharp editorial serif like the title walls of contemporary galleries. It contrasts with the blocky BEN F mark instead of competing with it. |
| Body | **Barlow** 400 (brand font) | Keeps the brand voice. Clear and friendly at body sizes. |
| Labels / navigation / buttons | **Barlow** 500, uppercase, tracked +0.18em | The brand guide's "wide-tracked caps", used the way museums set wall labels |

- Body text is 17px with 1.65 line height. Paragraphs are at most 60ch wide.
- Headings use a fluid size `clamp()` and a light, wide-open look, with no bold serifs.
- Numbers (catalog no., price) use tabular figures.

## 3. Section order (conversion-focused)

| # | Section | Job |
|---|---|---|
| 1 | **Nav** | Fixed. BEN F mark on the left; Work · Studio · How to buy · Contact; a "Shop" link. Transparent over the dark hero, then Cream after scrolling. |
| 2 | **Hero (Kiln, dark)** | A single featured piece, a short statement and two actions: *See available work* and *How buying works*. Shows a live count such as "8 pieces available". |
| 3 | **New from the kiln** | 3 newest pieces shown large, gallery style, with wall labels. Puts the work right next to the hero. |
| 4 | **The collection** | Full grid with category filter and an "Available only" toggle. Every card opens the piece. |
| 5 | **How to buy** | Three steps: Choose → Pay on Venmo → Mark it reserved or purchased. Covers pickup and shipping. Removes doubt before the visitor commits. |
| 6 | **Studio** | Short maker story, the maker's-mark stamp and a portrait. Builds trust. |
| 7 | **Commissions / contact (Kiln, dark)** | Asks for custom work or questions, with an email button |
| 8 | **Footer** | Monogram, links, Venmo handle, © |

## 4. Piece view (the "gallery room")

- A full-screen overlay: the artwork is large on one side and the wall label is on the other.
- **Previous / next arrows**, plus ← → keyboard keys and swipe on phones, move between pieces like walking a gallery. Esc closes it.
- The address bar updates (`#piece-<id>`) so a piece can be shared with family by link.
- The wall label shows catalog number, title, year, clay and glaze, size, price and status.
- The buy panel opens inside the same view (see §6).

## 5. Motion

- **Scroll reveal:** sections and cards fade in and rise 18px as they enter the screen, over 600ms with a soft ease-out. Items in a grid follow each other 60ms apart. Each element animates once.
- **Nav:** the background and logo color fade over 250ms on scroll. The active section's link gets a short Clay underline.
- **Piece view:** fades and scales in from 0.98 over 300ms. The artwork crossfades when you step to the next piece.
- **Hover:** the image zooms to 1.03 inside its frame (no layout shift), and links get an underline that grows outward.
- `prefers-reduced-motion`: all of this motion is turned off, and content simply appears.
- Smooth anchor scrolling, with offsets so the fixed nav never covers a heading.

## 6. Buying flow (Venmo + notification)

1. **Buy this piece** opens the buy panel.
2. **Pay $X on Venmo**: opens Venmo to @finkalink with the amount and a note filled in ("BEN F No. 041 – Speckled Mug").
3. A short form: name, email or phone, *Purchased* (I've paid) or *Reserve* (hold it, I'll pay within 48 hours), pickup or shipping (with an address field if shipping), and an optional note.
4. Submit → an email notification goes to Ben (sent through FormSubmit, since the site has no server).
   The piece then shows as Reserved/Purchased in that buyer's browser.
5. Ben confirms, then sets the piece's `status` in `js/products.js` so everyone sees it as on hold or sold.

Pickup is free. Shipping is quoted per order and paid separately.

## 7. Content rules

- No corporate buzzwords: elevate, unleash, curated, seamless, journey, artisanal experience, etc.
- Short copy: every paragraph is three sentences or fewer, and there are no walls of text.
- The voice is warm, plain and first-person, as if a friend made these.
- Every image has alt text, every button says exactly what it does, and icons are SVG (no emoji).

## 8. Layout and responsiveness

- The content area is up to 1240px wide, with a 16px side margin on phones and 40px on desktop.
- Grid: 1 column on phones, 2 at 640px, 3 at 1024px, 4 at 1440px (collection).
- Touch targets are at least 44px. Focus rings are a 2px Clay-Deep outline.
- On phones the nav becomes a full-screen menu with large serif links, like a museum floor guide.
- Tested at 375, 768, 1024 and 1440px wide with no sideways scrolling.

## 9. Assets

- Logos: `assets/brand/` (single-color SVGs from the marketing set, tinted through CSS masks)
- Favicons: from the marketing set (`favicon.ico`, 32px, 180px)
- Product photos: `images/`. Until there are real photos, pieces use generated pottery placeholders drawn in each piece's glaze color.
