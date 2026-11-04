import { timingSafeEqual } from 'node:crypto';
export function isInternalService(header: string | string[] | undefined): boolean {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected || expected.length < 32 || typeof header !== 'string') return false;
  const supplied = Buffer.from(header);
  const secret = Buffer.from(expected);
  return supplied.length === secret.length && timingSafeEqual(supplied, secret);
}
