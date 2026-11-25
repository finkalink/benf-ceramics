# Ceramics Website

A simple, no-build static site for listing handmade ceramics.

## Viewing it
Double-click `index.html` to open it in your browser. No install needed.

## Files
| File | What it is |
|---|---|
| `index.html` | Page layout: header, hero, shop, about, contact |
| `css/styles.css` | All styling. Colors and fonts are at the top under "Design tokens" |
| `js/products.js` | **Your inventory and shop settings — edit this to add/remove pieces** |
| `js/main.js` | Renders the shop grid, category filters, and product popup |
| `images/` | Put your product photos here |

## Adding a piece
1. Put a photo in `images/` (e.g. `images/blue-bowl.jpg`). Portrait (4:5) crops best.
2. Copy one `{ ... }` block in `js/products.js`, give it a unique `id`, and set `image: "images/blue-bowl.jpg"`.
3. When it sells, change `status` to `"sold"`.

## Still to do
- Replace "Studio Name", the email, and the About text with your own
- Real product photos
- Checkout: currently "Inquire to purchase" opens an email. Options for real payments:
  Stripe Payment Links (easiest), Shopify Buy Button, or Square
- Hosting: Netlify, GitHub Pages, or Cloudflare Pages (all free for a site like this)
