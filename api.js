export async function api(path, data) {
  const response = await fetch(`/api/${path}`, data === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error("Bitte den lokalen Shopserver auf Port 8001 starten."); }
  if (!response.ok) throw new Error(result.error || "Der Shop ist gerade nicht erreichbar.");
  return result;
}
