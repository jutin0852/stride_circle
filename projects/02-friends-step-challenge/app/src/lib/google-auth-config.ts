/** OAuth client IDs are public identifiers, never client secrets. */
export function isGoogleClientId(value: string | undefined): value is string {
  return Boolean(value && /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(value));
}
