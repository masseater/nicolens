const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "[::1]"]);
const PRIVATE_HOST_PREFIXES = ["127.", "10.", "192.168.", "169.254."];
const PRIVATE_172_PATTERN = /^172\.(?:1[6-9]|2\d|3[01])\./;

const tryParseUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

const isIpv6Literal = (host: string): boolean => host.includes(":") || host.startsWith("[");

const isPrivateHost = (host: string): boolean => {
  if (BLOCKED_HOSTS.has(host)) {
    return true;
  }
  // Reject all IPv6 literal hostnames; overly strict but safe for webhooks.
  if (isIpv6Literal(host)) {
    return true;
  }
  if (PRIVATE_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) {
    return true;
  }
  return PRIVATE_172_PATTERN.test(host);
};

export const validateWebhookUrl = (url: string): boolean => {
  if (url === "") {
    return false;
  }
  const parsed = tryParseUrl(url);
  if (parsed === undefined) {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  return !isPrivateHost(parsed.hostname);
};
