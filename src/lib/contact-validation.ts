// Let validering af kontaktfelter i bookingflowet. En forkert e-mail betyder,
// at kunden aldrig får sin bekræftelse — derfor fanger vi de åbenlyse fejl.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

// Danske numre har 8 cifre; med landekode (+45/0045) eller udenlandske numre
// accepterer vi op til 15 cifre.
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
