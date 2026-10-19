/**
 * Log-safety helpers.
 *
 * The MongoDB connection string (mongodb:// or mongodb+srv:// with userinfo)
 * must NEVER appear in logs or error output. Everything that flows through
 * the pino logger and the seed's error handler is passed through
 * `scrubMongoUri`, which redacts credentials while keeping the host and
 * database name — the two things you actually need when debugging.
 */
export function scrubMongoUri(text: string): string {
  return (
    text
      // scheme://userinfo@host  →  scheme://[REDACTED]@host
      // (`[^/]*@` is greedy up to the last @ before the first `/`, so even a
      // password containing an unencoded `@` is fully redacted)
      .replace(/(mongodb(?:\+srv)?:\/\/)[^/\s]*@/gi, '$1[REDACTED]@')
      // Driver auth-failure wording names the username without the URI:
      .replace(/username set via 'uri' option is '[^']*'/gi, "username set via 'uri' option is '[REDACTED]'")
  );
}
