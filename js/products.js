/*
  =====================================================================
  BEN F · YOUR SHOP SETTINGS AND INVENTORY
  =====================================================================
  This is the only file you need to edit to change what's for sale.

  STATUS (what everyone sees):
    "available"  can be bought
    "reserved"   someone asked you to hold it (shows "On hold")
    "sold"       gone

  When you get a "Reserved" or "Purchased" email, change that piece's
  status here and publish. Until you do, only the buyer's own browser
  shows it as theirs.

  PHOTOS:
    Put a photo in /images and set  image: "images/your-photo.jpg"
    Portrait photos (4:5) on a plain wall look best.
    Leave image as "" to show a drawn placeholder in the glaze color.
  =====================================================================
*/

const SHOP = {
  name: "BEN F",
  email: "bdfink.su@gmail.com",      // notifications + "Email Ben" button
  venmo: "finkalink",                // without the @
  currency: "USD",
  heroPiece: "036",                 // catalog no. shown large at the top
  newPieces: ["043", "042", "041"],  // "New from the kiln" (first one is shown largest)
};

const PRODUCTS = [
  {
    no: "043",
    name: "Tenmoku Bottle Vase",
    category: "Vases",
    shape: "vase",
    price: 68,
    status: "available",
    year: 2026,
    clay: "Stoneware",
    glaze: "Tenmoku",
    size: "8 in tall",
    description: "A glossy, near-black glaze that breaks to rust wherever it thins. Holds a few stems or stands fine on its own.",
    image: "",
    glazeColor: "#3B2219",
    clayColor: "#B98A64",
  },
  {
    no: "042",
    name: "Celadon Serving Bowl",
    category: "Bowls",
    shape: "bowl",
    price: 85,
    status: "available",
    year: 2026,
    clay: "Porcelain",
    glaze: "Celadon",
    size: "10 in wide · 3.5 in tall",
    description: "Wide and shallow, made for salads and fruit. The pale green pools darker in the carved lines.",
    image: "",
    glazeColor: "#A9C3B0",
    clayColor: "#E8E0D6",
  },
  {
    no: "041",
    name: "Speckled Morning Mug",
    category: "Mugs",
    shape: "mug",
    price: 42,
    status: "available",
    year: 2026,
    clay: "Speckled stoneware",
    glaze: "Satin white",
    size: "4 in tall · holds 12 oz",
    description: "My everyday mug. A wide handle with room for three fingers and a lip that's comfortable to drink from.",
    image: "",
    glazeColor: "#ECE5D8",
    clayColor: "#C9A27E",
    speckle: true,
  },
  {
    no: "038",
    name: "Ash Glaze Yunomi",
    category: "Cups",
    shape: "cup",
    price: 36,
    status: "reserved",
    year: 2026,
    clay: "Stoneware",
    glaze: "Wood ash",
    size: "4.5 in tall · holds 8 oz",
    description: "A handleless tea cup. The ash glaze runs and drips a little differently on every one.",
    image: "",
    glazeColor: "#B5A36E",
    clayColor: "#A87F5C",
  },
  {
    no: "036",
    name: "Shino Lidded Jar",
    category: "Jars",
    shape: "jar",
    price: 95,
    status: "available",
    year: 2025,
    clay: "Stoneware",
    glaze: "Shino",
    size: "6 in tall",
    description: "A snug lid for sugar, salt or coffee beans. The glaze shifts from peach to soft orange.",
    image: "",
    glazeColor: "#E3B48D",
    clayColor: "#C08860",
  },
  {
    no: "035",
    name: "Iron Red Dinner Plate",
    category: "Plates",
    shape: "plate",
    price: 48,
    status: "available",
    year: 2025,
    clay: "Stoneware",
    glaze: "Iron red",
    size: "10.5 in wide",
    description: "A deep, warm red with a raw clay rim. Strong enough for everyday dinners.",
    image: "",
    glazeColor: "#8E3B22",
    clayColor: "#B98A64",
  },
  {
    no: "033",
    name: "Terracotta Planter",
    category: "Planters",
    shape: "planter",
    price: 64,
    status: "available",
    year: 2025,
    clay: "Terracotta",
    glaze: "Unglazed, clear inside",
    size: "6 in wide · with saucer",
    description: "Raw terracotta that breathes, with a drainage hole and a matching saucer.",
    image: "",
    glazeColor: "#B86B47",
    clayColor: "#B86B47",
  },
  {
    no: "029",
    name: "Oatmeal Pasta Bowl",
    category: "Bowls",
    shape: "bowl",
    price: 52,
    status: "available",
    year: 2025,
    clay: "Speckled stoneware",
    glaze: "Oatmeal",
    size: "8.5 in wide · 2.5 in tall",
    description: "Low and wide with a soft, speckled matte glaze. Good for pasta, curry and big salads.",
    image: "",
    glazeColor: "#D8C7A8",
    clayColor: "#B59272",
    speckle: true,
  },
  {
    no: "027",
    name: "Copper Green Bud Vase",
    category: "Vases",
    shape: "vase",
    price: 38,
    status: "sold",
    year: 2025,
    clay: "Porcelain",
    glaze: "Copper green",
    size: "6 in tall",
    description: "Small and bright, sized for a single stem on a windowsill.",
    image: "",
    glazeColor: "#5E7F64",
    clayColor: "#E8E0D6",
  },
  {
    no: "024",
    name: "Black Satin Mug",
    category: "Mugs",
    shape: "mug",
    price: 42,
    status: "sold",
    year: 2025,
    clay: "Stoneware",
    glaze: "Black satin",
    size: "4 in tall · holds 12 oz",
    description: "A soft-touch matte black with the raw clay foot left bare.",
    image: "",
    glazeColor: "#2A2623",
    clayColor: "#A87F5C",
  },
];
