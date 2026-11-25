# BEN F · Handmade Ceramics

Live site: https://finkalink.github.io/benf-ceramics/

A static site (plain HTML, CSS and JavaScript) hosted on GitHub Pages. Design decisions are in [design.md](design.md).

## Everyday edits: `js/products.js`

Everything you'll change regularly is in this one file:

- **Shop settings** at the top: email, Venmo handle, which piece appears at the top of the page (`heroPiece`), and which pieces are under "New from the kiln" (`newPieces`).
- **Pieces**: one `{ ... }` block per piece.

### Add a piece
1. Put a photo in `images/`, e.g. `images/044-blue-mug.jpg`. A portrait (4:5) photo against a plain wall works best.
2. Copy an existing block, give it a new `no`, and set `image: "images/044-blue-mug.jpg"`.
3. Commit and push. The site updates in about a minute.

### When someone reserves or buys
The buyer pays you on Venmo (@finkalink) and fills in the short form, which emails you a notice with
**RESERVED** or **PURCHASED** in the subject line. Then:
- Reserved → set that piece's `status: "reserved"` (shows "On hold" to everyone)
- Purchased → set `status: "sold"`
- A hold that falls through → set it back to `"available"`

Until you change the status, only the buyer's own browser shows the piece as theirs.

### One-time setup: email notifications
Notices are sent through [FormSubmit](https://formsubmit.co) (free, no account needed).
The **first** time the form is used, FormSubmit sends an "Activate form" email to your Gmail.
Click the link in it once. Until you do, buyers see a fallback "Email it to me instead" link.

## Files
| Path | What it is |
|---|---|
| `index.html` | The page structure: sections, nav and the piece viewer |
| `css/styles.css` | All styles. Colors and fonts are at the top |
| `js/products.js` | **Your inventory and shop settings** |
| `js/pottery.js` | Drawn pottery placeholders, used until a piece has a photo |
| `js/main.js` | Grid, filters, piece viewer, buy form, animations |
| `assets/brand/` | BEN F logos and favicons from the marketing set |
| `images/` | Your product photos |
| `design.md` | Palette, fonts, section order and motion rules |

## Preview on your computer
Double-click `index.html`, or run a local server:
```
npx http-server -p 5173 -c-1
```
