# BEN F · Handmade Ceramics

Live site: https://finkalink.github.io/benf-ceramics/

A static site (plain HTML, CSS and JavaScript) hosted on GitHub Pages. Design decisions are in [design.md](design.md).

## Adding and editing works: the Studio page

Open the site, scroll to the footer and tap the **©** symbol (or go to `/admin.html`). Enter the PIN.

- **Add a work**: add photos (several per piece; the first is the cover), name, price, type, status and details.
- **Edit**: tap any work. Reorder photos with the arrows or by dragging, and remove one with ×.
- **Crop card**: on the cover photo, frame how the piece looks on its gallery card. Untouched = centered automatically.
- **Featured at the top**: pick the top photo, a frame shape (Tall / Square / Wide), and a crop for each photo.
- **Status**: change Available / On hold / Sold right from the list.
- **Delete**: open a work → *Delete this work*.
- **Publish**: changes stay on the page until you tap **Publish**. Everything goes to the site in one step and is live in about a minute.

Photos are resized on your device (max 1800px, JPEG) before upload, so full-size phone photos are fine.

### One-time setup per device
The Studio page saves by committing to this GitHub repository, so each device needs a GitHub
fine-grained access token (the page walks you through it):
repository access **benf-ceramics** only, permission **Contents: Read and write** (optional: **Pages: Read-only**).
The token is stored only in that browser. *Practice mode* lets you try everything without saving.

**About the PIN:** it keeps visitors out of the Studio screen. This is a public static site, so
the PIN alone can't stop a determined person who reads the page's code. The real lock is the
GitHub token, which lives only on your devices. Without it, nothing on the site can be changed.

### Archive: sold, gifted and kept pieces
Statuses are **Available**, **On hold**, **Sold**, **Gifted** and **Kept** (shown publicly as "Not for sale").
For anything that isn't available, the editor shows a **private record**: who has it, their contact,
the date, the price paid, how it was paid and handed off, and notes. The list's **Archive** filter shows
sold, gifted and kept pieces, and the header tallies how many are out in the world and what's been raised.

Records are saved to the separate **private** repository `finkalink/benf-records` (file `records.json`),
never to this public site. The Studio page refuses to save records if that repository is public.
Your access token must include both `benf-ceramics` and `benf-records`.

**Hide from the public site** keeps a piece in your archive while leaving it off the website.

### When someone reserves or buys
You get an email with **RESERVED** or **PURCHASED** in the subject. Open the Studio page, set that work
to *On hold* or *Sold*, and publish.

### Email notifications
Notices are sent through [Web3Forms](https://web3forms.com) (free, 250 a month) using the access key
in **Studio → Shop settings → Web3Forms access key**. To change it, get a new key at web3forms.com
(it's emailed to you), paste it there and publish. The key is meant to be public, so it's fine in the site's code.
If the key is empty, the form falls back to FormSubmit. If sending ever fails, buyers see an
"Email it to me instead" link, so no order is lost.

## Files
| Path | What it is |
|---|---|
| `index.html` | The page structure: sections, nav and the piece viewer |
| `css/styles.css` | All site styles. Colors and fonts are at the top |
| `data/products.json` | Inventory and shop settings (edited by the Studio page) |
| `admin.html`, `js/admin.js`, `css/admin.css` | The PIN-locked Studio page |
| `js/github.js` | Saves Studio changes to GitHub as one commit |
| `js/pottery.js` | Drawn pottery placeholders, used until a piece has a photo |
| `js/main.js` | Grid, filters, piece viewer, buy form, animations |
| `assets/brand/` | BEN F logos and favicons from the marketing set |
| `images/` | Product photos (uploaded by the Studio page) |
| `design.md` | Palette, fonts, section order and motion rules |

## Preview on your computer
The site loads its works with a web request, so open it through a local server
(double-clicking `index.html` won't load the works):
```
npx http-server -p 5173 -c-1
```
