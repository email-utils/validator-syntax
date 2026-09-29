// The IANA TLD set, from the `tlds` package, which the build inlines. Built
// on first use so importing the package costs nothing until a TLD is
// checked. `tlds` lists IDN TLDs by their U-labels (`рф`) only, so the set
// adds each one's A-label (`xn--p1ai`), which is the form a DNS name uses.
import tlds from 'tlds/index.json' with { type: 'json' };
import { toALabel } from './idn';

let known: ReadonlySet<string> | undefined;

/** Whether `tld` is in the IANA set, as a U-label or A-label, ignoring case. */
export function isKnownTld(tld: string): boolean {
  known ??= buildSet();
  return known.has(tld.toLowerCase());
}

function buildSet(): Set<string> {
  const set = new Set(tlds);
  for (const tld of tlds) {
    if (!/^[a-z\d]+$/.test(tld)) {
      const aLabel = toALabel(tld);
      if (aLabel !== undefined) {
        set.add(aLabel);
      }
    }
  }
  return set;
}
