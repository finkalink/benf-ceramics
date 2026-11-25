/*
  Drawn placeholders for pieces without photos.
  Each piece is drawn on a gallery plinth in its own glaze color,
  with a raw-clay foot and (optionally) iron speckle.
*/
const Pottery = (() => {
  let uid = 0;

  // Body outlines in a 400 x 500 box. Ground line is y = 410.
  const SHAPES = {
    mug: {
      body: "M118 186 L118 388 Q118 410 140 410 L260 410 Q282 410 282 388 L282 186 Z",
      rim: { cx: 200, cy: 186, rx: 82, ry: 13 },
      extra: (g) => `<path d="M282 232 C344 228 350 330 282 344" fill="none" stroke="${g}" stroke-width="20" stroke-linecap="round"/>`,
      foot: 26,
    },
    bowl: {
      body: "M64 262 Q70 410 200 410 Q330 410 336 262 Z",
      rim: { cx: 200, cy: 262, rx: 136, ry: 26 },
      foot: 22,
    },
    vase: {
      body: "M178 112 L222 112 L220 146 Q220 176 252 206 Q300 258 296 330 Q292 402 240 410 L160 410 Q108 402 104 330 Q100 258 148 206 Q180 176 180 146 Z",
      rim: { cx: 200, cy: 112, rx: 22, ry: 5 },
      foot: 24,
    },
    cup: {
      body: "M146 196 L254 196 L247 394 Q246 410 230 410 L170 410 Q154 410 153 394 Z",
      rim: { cx: 200, cy: 196, rx: 54, ry: 9 },
      foot: 30,
    },
    jar: {
      body: "M134 212 Q98 262 104 334 Q112 406 168 410 L232 410 Q288 406 296 334 Q302 262 266 212 Z",
      extraBefore: (g, shade) =>
        `<path d="M142 212 L258 212 L252 188 L148 188 Z" fill="${g}"/><path d="M142 212 L258 212 L252 188 L148 188 Z" fill="url(#${shade})"/>` +
        `<ellipse cx="200" cy="180" rx="18" ry="11" fill="${g}"/><ellipse cx="200" cy="180" rx="18" ry="11" fill="url(#${shade})"/>`,
      foot: 24,
    },
    planter: {
      body: "M112 196 L288 196 L266 376 L134 376 Z",
      rim: { cx: 200, cy: 196, rx: 88, ry: 13, fill: "#3A2A20" },
      extra: (g) => `<path d="M104 376 L296 376 L286 410 L114 410 Z" fill="${g}"/><path d="M104 376 L296 376 L286 410 L114 410 Z" fill="rgba(0,0,0,.12)"/>`,
      foot: 0,
    },
    plate: { plate: true },
  };

  function hash(str) {
    let h = 2166136261;
    for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function rand(seed) {
    return () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296);
  }

  function speckles(seed, n, x0, x1, y0, y1) {
    const r = rand(seed);
    let out = "";
    for (let i = 0; i < n; i++) {
      out += `<circle cx="${(x0 + r() * (x1 - x0)).toFixed(1)}" cy="${(y0 + r() * (y1 - y0)).toFixed(1)}" r="${(0.8 + r() * 1.6).toFixed(1)}"/>`;
    }
    return `<g fill="#4A3426" opacity=".55">${out}</g>`;
  }

  function svg(piece, opts = {}) {
    const id = `p${++uid}`;
    const g = piece.glazeColor || "#C9B8A6";
    const clay = piece.clayColor || "#B98A64";
    const wall = opts.wall || "#F3ECE2";
    const floor = opts.floor || "#E7DDCF";
    const shape = SHAPES[piece.shape] || SHAPES.vase;
    const label = opts.label || piece.name;

    const defs = `
      <linearGradient id="${id}s" x1="0" x2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".30"/>
        <stop offset=".38" stop-color="#fff" stop-opacity=".06"/>
        <stop offset=".7" stop-color="#000" stop-opacity=".10"/>
        <stop offset="1" stop-color="#000" stop-opacity=".34"/>
      </linearGradient>
      <radialGradient id="${id}g" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#000" stop-opacity=".22"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>`;

    let art;
    if (shape.plate) {
      art = `
        <ellipse cx="200" cy="404" rx="190" ry="26" fill="url(#${id}g)"/>
        <ellipse cx="200" cy="372" rx="168" ry="44" fill="${clay}"/>
        <ellipse cx="200" cy="362" rx="168" ry="44" fill="${g}"/>
        <ellipse cx="200" cy="362" rx="168" ry="44" fill="url(#${id}s)"/>
        <ellipse cx="200" cy="364" rx="120" ry="29" fill="#000" opacity=".10"/>
        <ellipse cx="200" cy="362" rx="168" ry="44" fill="none" stroke="${clay}" stroke-width="5" opacity=".9"/>
        ${piece.speckle ? speckles(hash(piece.no), 90, 60, 340, 335, 395) : ""}`;
    } else {
      const top = shape.rim ? shape.rim.cy : 180;
      const footY = 410 - shape.foot;
      art = `
        <defs><clipPath id="${id}c"><path d="${shape.body}"/></clipPath></defs>
        <ellipse cx="200" cy="410" rx="150" ry="18" fill="url(#${id}g)"/>
        ${shape.extraBefore ? shape.extraBefore(g, id + "s") : ""}
        <g clip-path="url(#${id}c)">
          <rect x="0" y="0" width="400" height="500" fill="${g}"/>
          ${shape.foot ? `<path d="M0 ${footY} Q100 ${footY - 6} 200 ${footY + 2} T400 ${footY - 2} V500 H0 Z" fill="${clay}"/>` : ""}
          ${piece.speckle ? speckles(hash(piece.no), 140, 90, 310, top, 410) : ""}
          <rect x="0" y="0" width="400" height="500" fill="url(#${id}s)"/>
        </g>
        ${shape.extra ? shape.extra(g) : ""}
        ${shape.rim ? `<ellipse cx="${shape.rim.cx}" cy="${shape.rim.cy}" rx="${shape.rim.rx}" ry="${shape.rim.ry}" fill="${shape.rim.fill || g}"/>
          <ellipse cx="${shape.rim.cx}" cy="${shape.rim.cy + 1}" rx="${shape.rim.rx - 6}" ry="${Math.max(shape.rim.ry - 3, 2)}" fill="#000" opacity="${shape.rim.fill ? 0 : .28}"/>` : ""}`;
    }

    return `<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid slice">
      <defs>${defs}</defs>
      <rect width="400" height="500" fill="${wall}"/>
      <rect y="410" width="400" height="90" fill="${floor}"/>
      ${art}
    </svg>`;
  }

  return { svg };
})();
