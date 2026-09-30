// IDN labels: a U-label (`bücher`) and its A-label (`xn--bcher-kva`), the
// form DNS carries it in.

const ldh = /^[\da-z-]+$/;

/**
 * The hostname of `http://x.` and `host`, or `undefined` when the WHATWG URL
 * parser rejects it. `URL.parse` says so without the cost of throwing, a few
 * µs a time, so an address built to fail many conversions stays fast;
 * runtimes that predate it (Node before 22.1) throw instead.
 */
const hostnameOf: (host: string) => string | undefined =
  typeof URL.parse === 'function'
    ? (host) => URL.parse(`http://x.${host}`)?.hostname
    : (host) => {
        try {
          return new URL(`http://x.${host}`).hostname;
        } catch {
          return undefined;
        }
      };

/**
 * The A-label for a U-label, or `undefined` when UTS #46 rejects it or maps
 * it to something other than one IDN label (plain ASCII, or two labels, as
 * `。` becomes a dot).
 *
 * @remarks
 * Converts by way of the WHATWG URL host parser, which every runtime the
 * package supports has and which applies UTS #46 with its bidi and joiner
 * checks. It leaves hyphens and lengths alone, so the caller checks those.
 */
export function toALabel(label: string): string | undefined {
  const aLabel = hostnameOf(label)?.slice(2);
  return aLabel?.startsWith('xn--') === true && ldh.test(aLabel)
    ? aLabel
    : undefined;
}

// Characters of the right-to-left scripts, and the ones UTS #46 maps to
// them (ℵ to א). A domain with one is a Bidi domain name, which UTS #46 holds
// to RFC 5893's rules label by label.
const rtl =
  /[\u0590-\u08ff\u2135-\u2138\ufb1d-\ufdff\ufe70-\ufeff\u{10800}-\u{10fff}\u{1e800}-\u{1efff}]/u;

/**
 * The A-label for each U-label in `labels`, as {@link toALabel} gives it,
 * converted as few domains as it can: one URL costs about as much as one
 * label does.
 *
 * @remarks
 * Every entry up to the first `undefined` is exact; entries after it may be
 * left `undefined` unconverted. Converted together, a right-to-left label
 * would hold the others to RFC 5893's rules too, which it doesn't alone, so
 * right-to-left labels go in a domain of their own. Converting more labels
 * at once only adds rules, so a domain that converts means every label
 * would alone; one that doesn't is narrowed down to its first label that
 * fails alone.
 */
export function toALabels(labels: readonly string[]): (string | undefined)[] {
  if (!labels.some((label) => rtl.test(label))) {
    return convertGroup(labels);
  }
  const aLabels: (string | undefined)[] = labels.map(() => undefined);
  for (const bidi of [false, true]) {
    const members: number[] = [];
    labels.forEach((label, k) => {
      if (rtl.test(label) === bidi) {
        members.push(k);
      }
    });
    if (members.length > 0) {
      const converted = convertGroup(members.map((k) => labels[k]!));
      converted.forEach((aLabel, j) => {
        aLabels[members[j]!] = aLabel;
      });
    }
  }
  return aLabels;
}

/** {@link toALabels} for labels converted together. */
function convertGroup(labels: readonly string[]): (string | undefined)[] {
  const all = convert(labels);
  if (all !== undefined) {
    return all;
  }
  // The shortest run of labels from the start that fails: `pass` converts,
  // and the first `failing` labels don't.
  let pass: string[] = [];
  let failing = labels.length;
  while (failing - pass.length > 1) {
    const some = convert(labels.slice(0, (pass.length + failing) >> 1));
    if (some === undefined) {
      failing = (pass.length + failing) >> 1;
    } else {
      pass = some;
    }
  }
  // Its last label fails, unless only alongside the others; then the labels
  // after it are converted alone, up to the first that fails.
  const aLabels: (string | undefined)[] = pass;
  for (let k = pass.length; k < labels.length; k++) {
    const aLabel = toALabel(labels[k]!);
    aLabels.push(aLabel);
    if (aLabel === undefined) {
      break;
    }
  }
  return aLabels;
}

// A converted host: `x`, then A-labels.
const aLabelHost = /^x(?:\.xn--[\da-z-]+)+$/;

/** `labels` converted as one domain, or `undefined`. */
function convert(labels: readonly string[]): string[] | undefined {
  const hostname = hostnameOf(labels.join('.'));
  if (hostname === undefined || !aLabelHost.test(hostname)) {
    return undefined;
  }
  const aLabels = hostname.split('.');
  aLabels.shift();
  return aLabels.length === labels.length ? aLabels : undefined;
}
