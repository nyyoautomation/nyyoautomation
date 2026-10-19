function parseCSV(text) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    // naive CSV (demo file has no embedded commas in critical fields except desc — handle quotes lightly)
    const cols = []; let cur = ""; let q = false;
    for (const c of line) {
      if (c === '"') { q = !q; continue; }
      if (c === "," && !q) { cols.push(cur); cur = ""; continue; }
      cur += c;
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, i) => (row[h] = (cols[i] || "").trim()));
    return row;
  });
}
function slug(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "item";
}
function titleCase(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function cleanSupplier(rows) {
  const cleaned = [];
  const skipped = [];
  for (const r of rows) {
    const name = titleCase(r.name);
    if (!name || !r.sku) { skipped.push(r); continue; }
    const price = Number(String(r.price).replace(",", "."));
    if (!isFinite(price)) { skipped.push(r); continue; }
    const handle = slug(name.replace(/\b(black|white|red|navy|blue|default|one size|onesize)\b/gi, "").trim() || name);
    cleaned.push({
      Handle: handle,
      Title: name.replace(/\b(black|white|red|navy|blue)\b/gi, "").replace(/\s+/g, " ").trim() || name,
      "Body (HTML)": `<p>${(r.desc || name).replace(/</g, "")}</p>`,
      Vendor: "Nyyo Demo Supplier",
      Type: "Demo",
      Tags: "nyyo-demo",
      Published: "TRUE",
      Option1_Name: r.size || r.color ? "Title" : "Title",
      Option1_Value: [r.color, r.size].filter(Boolean).join(" / ") || "Default Title",
      "Variant SKU": r.sku,
      "Variant Price": price.toFixed(2),
      "Variant Inventory Qty": Number(r.stock) || 0,
      "Variant Inventory Tracker": "shopify",
      "Image Src": "",
      "SEO Title": `${name} | Demo Store`,
      "SEO Description": (r.desc || name).slice(0, 150),
    });
  }
  // group: ensure same Handle for same product family by base sku prefix before last segment — already via title slug
  return { cleaned, skipped };
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(",")].concat(rows.map((r) => headers.map((h) => esc(r[h])).join(","))).join("\n");
}

async function loadSample() {
  const text = await (await fetch("./samples/supplier_dirty.csv")).text();
  run(text);
}
function run(text) {
  const raw = parseCSV(text);
  const { cleaned, skipped } = cleanSupplier(raw);
  document.getElementById("stats").textContent =
    `Raw rows: ${raw.length} → Shopify rows: ${cleaned.length} · skipped: ${skipped.length}`;
  const pre = document.getElementById("out");
  pre.textContent = toCSV(cleaned).split("\n").slice(0, 8).join("\n") + "\n…";
  const blob = new Blob([toCSV(cleaned)], { type: "text/csv" });
  const a = document.getElementById("dl");
  a.href = URL.createObjectURL(blob);
  a.download = "shopify_products_import.csv";
  a.style.visibility = "visible";
  // fake stock sync log
  const sync = cleaned.map((r) => ({ sku: r["Variant SKU"], qty: r["Variant Inventory Qty"], status: "synced" }));
  document.getElementById("sync").textContent = JSON.stringify(sync.slice(0, 5), null, 2);
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sample").onclick = loadSample;
  document.getElementById("file").onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => run(String(r.result)); r.readAsText(f);
  };
  loadSample();
});
