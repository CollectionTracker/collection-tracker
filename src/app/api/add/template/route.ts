// One row per column the add dialog fills in, so a file made from it needs no fixing: cards first, then sealed products.
const TEMPLATE = [
  "kind,name,set,number,type,quantity,condition,variant,price paid",
  "card,Mega Gengar ex,Ascended Heroes,284,,1,NM,,",
  "card,Pikachu ex,Ascended Heroes,276,,2,NM,holofoil,410",
  "sealed,151 Elite Trainer Box,Scarlet & Violet 151,,etb,1,,,60",
  "sealed,Prismatic Evolutions Booster Bundle,Prismatic Evolutions,,bundle,6,,,",
  "",
].join("\r\n");

export function GET() {
  return new Response(TEMPLATE, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pokevault-add-template.csv"' },
  });
}
