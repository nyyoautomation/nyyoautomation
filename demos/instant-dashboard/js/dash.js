
// Chart colours come from the page tokens (palette B), read once at load.
function nyyoTokens() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  return { text: v("--text"), muted: v("--text-muted"), border: v("--border"), accent: v("--accent"), accentTint: v("--tint-accent"),
           neutral: v("--border-strong"), surface: v("--surface"),
           font: { family: "Inter, \"Inter Fallback\", system-ui, sans-serif", size: 13 } };
}
let NYYO_CHART = null;
function nyyoScales() {
  const t = NYYO_CHART;
  const axis = { ticks: { color: t.muted, font: t.font }, grid: { color: t.border }, border: { color: t.border } };
  return { x: { ...axis }, y: { ...axis } };
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cols = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}
function splitCSVLine(line) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { q = !q; continue; }
    if (c === "," && !q) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
function detect(rows) {
  if (!rows.length) return { date: null, cat: null, value: null };
  const keys = Object.keys(rows[0]);
  const date = keys.find((k) => /date|day|month/i.test(k)) || keys[0];
  const value = keys.find((k) => /revenue|amount|total|sales|value|usd/i.test(k))
    || keys.find((k) => rows.every((r) => r[k] === "" || !isNaN(Number(String(r[k]).replace(/[,$]/g, "")))))
    || keys[keys.length - 1];
  const cat = keys.find((k) => /region|product|category|channel|segment/i.test(k) && k !== date && k !== value) || keys[1];
  return { date, cat, value };
}
function num(v) { return Number(String(v).replace(/[,$\u20ac\s]/g, "")) || 0; }

let chartCat, chartTime;
function render(rows) {
  NYYO_CHART = NYYO_CHART || nyyoTokens();
  const { date, cat, value } = detect(rows);
  const total = rows.reduce((s, r) => s + num(r[value]), 0);
  const byCat = {};
  const byDate = {};
  rows.forEach((r) => {
    byCat[r[cat] || "—"] = (byCat[r[cat] || "—"] || 0) + num(r[value]);
    byDate[r[date] || "—"] = (byDate[r[date] || "—"] || 0) + num(r[value]);
  });
  document.getElementById("kpi-rows").textContent = rows.length;
  document.getElementById("kpi-total").textContent = "$" + total.toLocaleString(undefined, { maximumFractionDigits: 0 });
  document.getElementById("kpi-cats").textContent = Object.keys(byCat).length;
  document.getElementById("kpi-meta").textContent = `Using columns: date=${date} · category=${cat} · value=${value}`;

  const catLabels = Object.keys(byCat);
  const catData = catLabels.map((k) => byCat[k]);
  const dateLabels = Object.keys(byDate).sort();
  const dateData = dateLabels.map((k) => byDate[k]);

  if (chartCat) chartCat.destroy();
  if (chartTime) chartTime.destroy();
  chartCat = new Chart(document.getElementById("chartCat"), {
    type: "bar",
    data: { labels: catLabels, datasets: [{
      label: value, data: catData,
      backgroundColor: NYYO_CHART.accent,
      borderRadius: 4, borderSkipped: false, maxBarThickness: 42,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: NYYO_CHART.text, titleFont: NYYO_CHART.font, bodyFont: NYYO_CHART.font, padding: 10, cornerRadius: 10 } },
      scales: nyyoScales(),
      animation: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? false : { duration: 300 },
    },
  });
  chartTime = new Chart(document.getElementById("chartTime"), {
    type: "line",
    data: { labels: dateLabels, datasets: [{
      label: value, data: dateData,
      borderColor: NYYO_CHART.accent, backgroundColor: NYYO_CHART.accentTint,
      tension: 0.25, fill: true, pointRadius: 3, pointHoverRadius: 5,
      pointBackgroundColor: NYYO_CHART.accent, borderWidth: 2,
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: NYYO_CHART.text, titleFont: NYYO_CHART.font, bodyFont: NYYO_CHART.font, padding: 10, cornerRadius: 10 } },
      scales: { ...nyyoScales(), x: { ...nyyoScales().x, ticks: { ...nyyoScales().x.ticks, maxRotation: 45 } } },
      animation: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? false : { duration: 300 },
    },
  });

  const tb = document.getElementById("tbody");
  const headers = Object.keys(rows[0] || {});
  document.getElementById("thead").innerHTML = "<tr>" + headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("") + "</tr>";
  tb.innerHTML = rows.slice(0, 50).map((r) => "<tr>" + headers.map((h) => `<td>${esc(r[h])}</td>`).join("") + "</tr>").join("");
}

async function loadSample() {
  const res = await fetch("./samples/sales_demo.csv");
  const text = await res.text();
  render(parseCSV(text));
}

function onFile(file) {
  const reader = new FileReader();
  reader.onload = () => render(parseCSV(String(reader.result)));
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  const dz = document.getElementById("drop");
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("hot"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("hot"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault(); dz.classList.remove("hot");
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  });
  document.getElementById("file").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) onFile(f); });
  document.getElementById("sample").addEventListener("click", loadSample);
  loadSample();
});
