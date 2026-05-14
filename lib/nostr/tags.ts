export const CITIES = [
  { slug: "barcelona", label: "Barcelona" },
  { slug: "madrid", label: "Madrid" },
  { slug: "nyc", label: "New York" },
  { slug: "london", label: "London" },
  { slug: "berlin", label: "Berlin" },
];

export function cityTag(slug: string): [string, string] {
  return ["t", `city:${slug}`];
}

export function cityTagValue(slug: string): string {
  return `city:${slug}`;
}
