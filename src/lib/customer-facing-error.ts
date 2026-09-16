export function customerFacingError(
  error: unknown,
  fallback: string,
  knownMessages: readonly string[],
): string {
  if (error instanceof Error && knownMessages.includes(error.message)) {
    return error.message;
  }

  return fallback;
}
