/*
  YOUR INVENTORY
  --------------
  Add, edit, or remove pieces here. Each piece is one { ... } block.

  - id:        unique short name, no spaces (used in links)
  - image:     path to a photo in the /images folder, e.g. "images/speckled-mug.jpg"
               leave as "" to show a colored placeholder (uses `glaze`)
  - glaze:     placeholder color, only used when there is no image
  - status:    "available" or "sold"
  - category:  used for the filter buttons at the top of the shop
*/

const SHOP = {
  name: "Studio Name",
  email: "hello@example.com",   // where purchase inquiries go
  currency: "USD",
};

const PRODUCTS = [
  {
    id: "speckled-mug",
    name: "Speckled Mug",
    category: "Mugs",
    price: 42,
    status: "available",
    image: "",
    glaze: "#e8e0d2",
    description: "A generous everyday mug in speckled stoneware with a satin white glaze. Comfortable pulled handle.",
    dimensions: "4\" tall, holds ~12 oz",
    clay: "Speckled stoneware",
    glazeName: "Satin white",
  },
  {
    id: "celadon-bowl",
    name: "Celadon Serving Bowl",
    category: "Bowls",
    price: 85,
    status: "available",
    image: "",
    glaze: "#a9c3b4",
    description: "Wide serving bowl with a pale celadon glaze that pools darker in the carved lines.",
    dimensions: "10\" wide, 3.5\" tall",
    clay: "Porcelain",
    glazeName: "Celadon",
  },
  {
    id: "tenmoku-vase",
    name: "Tenmoku Bud Vase",
    category: "Vases",
    price: 58,
    status: "available",
    image: "",
    glaze: "#4a2e22",
    description: "Small bud vase with a glossy tenmoku glaze breaking to rust at the rim.",
    dimensions: "6\" tall",
    clay: "Stoneware",
    glazeName: "Tenmoku",
  },
  {
    id: "blue-plates",
    name: "Cobalt Dinner Plate",
    category: "Plates",
    price: 48,
    status: "available",
    image: "",
    glaze: "#3e5c8a",
    description: "Dinner plate with a deep cobalt center fading to raw clay at the edge.",
    dimensions: "10.5\" diameter",
    clay: "Stoneware",
    glazeName: "Cobalt blue",
  },
  {
    id: "ash-mug",
    name: "Ash Glaze Mug",
    category: "Mugs",
    price: 45,
    status: "sold",
    image: "",
    glaze: "#b7a37a",
    description: "Wood-ash glaze with natural drips down the body.",
    dimensions: "3.75\" tall, holds ~10 oz",
    clay: "Stoneware",
    glazeName: "Ash",
  },
  {
    id: "terracotta-planter",
    name: "Terracotta Planter",
    category: "Planters",
    price: 64,
    status: "available",
    image: "",
    glaze: "#b86b47",
    description: "Unglazed exterior planter with a drainage hole and matching saucer.",
    dimensions: "6\" wide, 5.5\" tall",
    clay: "Terracotta",
    glazeName: "Unglazed / clear interior",
  },
];
