import fs from "fs";

// 🔥 Helper to safely push values into arrays
function push(arr, val) {
  if (!arr) return [val];
  if (!arr.includes(val)) arr.push(val);
  return arr;
}

// 🔥 Basic keyword inference engine
function inferAttributes(product) {
  const text = (
    (product.description || "") +
    " " +
    (product.story || "") +
    " " +
    (product.tags || []).join(" ")
  ).toLowerCase();

  const attr = {
    skinType: [],
    concerns: [],
    hairType: [],
    hairConcerns: [],
    actives: [],
    ingredients: [],
    scentNotes: [],
    aesthetic: [],
    materials: product.materials || [],
    colorPalette: product.colorPalette || [],
    styleTags: product.styleTags || [],
    fit: [],
    silhouette: [],
    useCases: [],
    occasion: product.occasion || [],
    recipient: product.recipient || "",
  };

  // -------------------------------
  // 🌸 SKINCARE inference
  // -------------------------------
  const skinKeywords = {
    oily: ["oil", "matte"],
    dry: ["dry", "hydrating"],
    sensitive: ["gentle", "soothing"],
  };
  for (const [type, keys] of Object.entries(skinKeywords)) {
    if (keys.some((k) => text.includes(k)))
      attr.skinType = push(attr.skinType, type);
  }

  // Skincare concerns
  const concerns = {
    acne: ["acne", "blemish"],
    pigmentation: ["pigment", "dark spot"],
    texture: ["texture"],
    aging: ["wrinkle", "retinol"],
  };
  for (const [concern, keys] of Object.entries(concerns)) {
    if (keys.some((k) => text.includes(k)))
      attr.concerns = push(attr.concerns, concern);
  }

  // -------------------------------
  // 💇 HAIRCARE inference
  // -------------------------------
  const hairTypes = {
    straight: ["straight"],
    wavy: ["wavy"],
    curly: ["curly"],
    coily: ["coily"],
  };
  for (const [type, keys] of Object.entries(hairTypes)) {
    if (keys.some((k) => text.includes(k)))
      attr.hairType = push(attr.hairType, type);
  }

  const hairConcerns = {
    frizz: ["frizz"],
    dryness: ["dry"],
    dandruff: ["dandruff"],
  };
  for (const [c, keys] of Object.entries(hairConcerns)) {
    if (keys.some((k) => text.includes(k)))
      attr.hairConcerns = push(attr.hairConcerns, c);
  }

  // -------------------------------
  // 🌬 PERFUME / FRAGRANCE inference
  // -------------------------------
  const notes = {
    citrus: ["citrus", "fresh", "lime", "bergamot"],
    amber: ["amber"],
    spicy: ["spice", "spicy"],
    floral: ["jasmine", "rose", "floral"],
    woody: ["wood", "cedar", "sandal"],
    sweet: ["vanilla", "sweet"],
  };
  for (const [note, keys] of Object.entries(notes)) {
    if (keys.some((k) => text.includes(k)))
      attr.scentNotes = push(attr.scentNotes, note);
  }

  // -------------------------------
  // 🏡 HOME inference
  // -------------------------------
  const aestheticMap = {
    minimal: ["minimal"],
    modern: ["modern"],
    boho: ["boho"],
    industrial: ["industrial", "metal"],
    warm: ["warm"],
  };
  for (const [aesthetic, keys] of Object.entries(aestheticMap)) {
    if (keys.some((k) => text.includes(k)))
      attr.aesthetic = push(attr.aesthetic, aesthetic);
  }

  // -------------------------------
  // 👗 FASHION inference
  // -------------------------------
  const styleMap = {
    streetwear: ["streetwear", "oversized"],
    classic: ["classic"],
    luxury: ["luxury"],
    minimal: ["minimal"],
  };
  for (const [tag, keys] of Object.entries(styleMap)) {
    if (keys.some((k) => text.includes(k)))
      attr.styleTags = push(attr.styleTags, tag);
  }

  // Color palette inference
  const colorMap = {
    beige: ["beige", "tan"],
    black: ["black"],
    brown: ["brown", "leather"],
    gold: ["gold"],
    amber: ["amber"],
  };
  for (const [color, keys] of Object.entries(colorMap)) {
    if (keys.some((k) => text.includes(k)))
      attr.colorPalette = push(attr.colorPalette, color);
  }

  // Materials inference
  const materialMap = {
    leather: ["leather"],
    metal: ["metal"],
    wood: ["wood"],
    glass: ["glass"],
    cotton: ["cotton"],
  };
  for (const [mat, keys] of Object.entries(materialMap)) {
    if (keys.some((k) => text.includes(k)))
      attr.materials = push(attr.materials, mat);
  }

  // -------------------------------
  // 🎁 GIFTING inference
  // -------------------------------
  if (product.category?.toLowerCase() === "gift") {
    attr.useCases = push(attr.useCases, "gift");
  }

  // If item is premium / handcrafted
  if (text.includes("handcrafted") || text.includes("premium")) {
    attr.useCases = push(attr.useCases, "premium");
  }

  if (text.includes("daily") || text.includes("everyday")) {
    attr.useCases = push(attr.useCases, "daily use");
  }

  return attr;
}

// 🔥 Persona alignment defaults
function defaultPersonaAlignment(category) {
  return {
    skinScore: 0,
    hairScore: 0,
    styleScore: category === "Fashion" || category === "Gift" ? 0.5 : 0,
    homeScore: category === "Home" ? 0.6 : 0,
    fragranceScore: category === "Perfume" ? 1.0 : 0,
    lifestyleScore: 0.2,
    giftingScore: category === "Gift" ? 1.0 : 0,
  };
}

// ------------------------------------------------------
// 🚀 MAIN SCRIPT
// ------------------------------------------------------
async function transform() {
  console.log("📦 Loading exported products…");

  const raw = fs.readFileSync("products-export.json", "utf8");
  const products = JSON.parse(raw);

  console.log(`🔍 Found ${products.length} products.`);

  const upgraded = products.map((product) => {
    const attr = inferAttributes(product);

    return {
      ...product,

      // Ensure clean metadata structure
      styleTags: product.styleTags || [],
      colorPalette: product.colorPalette || [],
      materials: product.materials || [],

      attributes: attr,

      personaAlignment: defaultPersonaAlignment(product.category),

      // Remove unused fields
      embedding: undefined, // remove embeddings for fresh regen
    };
  });

  fs.writeFileSync("products-upgraded.json", JSON.stringify(upgraded, null, 2));
  console.log("✅ Transformation complete! Saved to products-upgraded.json");
}

transform();
