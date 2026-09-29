// The IANA TLD set, from the `tlds` package, which the build inlines. Built
// on first use so importing the package costs nothing until a TLD is
// checked. The A-label forms arrive with validator-syntax#13.
import tlds from 'tlds/index.json' with { type: 'json' };

let known: ReadonlySet<string> | undefined;

/** Whether `tld` is in the IANA set, ignoring case. */
export function isKnownTld(tld: string): boolean {
  known ??= new Set(tlds);
  return known.has(tld.toLowerCase());
}
