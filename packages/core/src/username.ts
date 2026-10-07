// Username autogen — friendly adjective-animal-number ids (e.g.
// "yellow-whale-523") for users who don't pick one. Deterministic from a
// pubkey so it's stable across devices without a lookup.
const ADJECTIVES = [
  "amber",
  "brisk",
  "calm",
  "cobalt",
  "copper",
  "early",
  "fuzzy",
  "gentle",
  "golden",
  "ivory",
  "jolly",
  "kind",
  "lucky",
  "mellow",
  "mossy",
  "north",
  "pearl",
  "quiet",
  "rusty",
  "sunny",
  "tidal",
  "velvet",
  "witty",
  "yellow",
];
const ANIMALS = [
  "badger",
  "beetle",
  "condor",
  "crane",
  "falcon",
  "ferret",
  "gecko",
  "heron",
  "ibis",
  "koala",
  "lemur",
  "lynx",
  "magpie",
  "newt",
  "otter",
  "panda",
  "puffin",
  "raven",
  "robin",
  "salmon",
  "stork",
  "turtle",
  "viper",
  "whale",
];

const pick = (list: string[], n: number) => list[n % list.length]!;

/** Deterministic friendly username from a pubkey — same id everywhere. */
export function usernameFor(pubkey: string): string {
  let h = 0;
  for (let i = 0; i < pubkey.length; i++) {
    h = (h * 31 + pubkey.charCodeAt(i)) | 0;
  }
  const u = Math.abs(h);
  return `${pick(ADJECTIVES, u)}-${pick(ANIMALS, u >>> 8)}-${String(u % 997).padStart(3, "0")}`;
}
