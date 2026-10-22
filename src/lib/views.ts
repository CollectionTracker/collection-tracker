export const VIEWS = [
  { href: "/", label: "Overview", short: "Overview" },
  { href: "/sealed", label: "Sealed Inventory", short: "Sealed" },
  { href: "/raw", label: "Raw Cards", short: "Raw Cards" },
  { href: "/scenarios", label: "Scenarios & Growth", short: "Scenarios" },
];

export function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
