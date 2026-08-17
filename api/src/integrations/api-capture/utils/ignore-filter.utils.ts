import { CaptureConfig } from '../interfaces/capture-entry.interface';
import { safeHostname } from './url.utils';

export function shouldIgnoreRequest(
  url: string,
  ignore: CaptureConfig['ignore'],
): boolean {
  const hostname = safeHostname(url);
  if (hostname === 'unknown') return false;
  return ignore.hostnames.some((pattern) => matchesHostname(hostname, pattern));
}

function matchesHostname(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".example.com"
    return hostname === pattern.slice(2) || hostname.endsWith(suffix);
  }
  return hostname === pattern || hostname.endsWith(`.${pattern}`);
}
