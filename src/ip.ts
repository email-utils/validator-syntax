// RFC 5321 §4.1.3 address literals: the text between the brackets of
// `[192.0.2.1]` or `[IPv6:2001:db8::1]`.

const octet = /^\d{1,3}$/;
const hexGroup = /^[\dA-Fa-f]{1,4}$/;

/** An IPv4 address: four dot-separated decimal octets, each 0–255. */
export function isIPv4(text: string): boolean {
  const parts = text.split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => octet.test(part) && Number(part) <= 255)
  );
}

/**
 * An IPv6 address as RFC 5321 writes it: eight hex groups, or a `::` with no
 * more than six groups beside it, and either may end in an IPv4 address in
 * place of the last two groups.
 */
export function isIPv6(text: string): boolean {
  const colon = text.lastIndexOf(':');
  const tail = text.slice(colon + 1);
  if (tail.includes('.')) {
    // An IPv4 tail stands in for two groups, which gives RFC 5321's limits
    // for the IPv6v4 forms: six groups in full, four beside a `::`.
    if (!isIPv4(tail)) {
      return false;
    }
    text = `${text.slice(0, colon + 1)}0:0`;
  }
  const halves = text.split('::');
  if (halves.length > 2) {
    return false;
  }
  const groups = halves.flatMap((half) => (half === '' ? [] : half.split(':')));
  return (
    groups.every((group) => hexGroup.test(group)) &&
    (halves.length === 1 ? groups.length === 8 : groups.length <= 6)
  );
}

/** The text of an RFC 5321 address literal: IPv4, or `IPv6:` and IPv6. */
export function isAddressLiteral(text: string): boolean {
  return /^IPv6:/i.test(text) ? isIPv6(text.slice(5)) : isIPv4(text);
}
