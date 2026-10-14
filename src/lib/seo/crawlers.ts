// Private and transactional paths. Every group below gets the same list:
// a crawler that matches a named group ignores the "*" group entirely, so
// a named group without these disallows would open /admin, /kasse etc.
export const PRIVATE_PATHS = [
  "/admin/",
  "/api/",
  "/kasse/",
  "/konto/",
  "/reparation/booking",
  "/reparation/bekraeftelse",
  "/reparation/status/",
  "/saelg-din-enhed/accepter",
  "/saelg-din-enhed/afvis",
  "/search",
  "/soeg",
  "/checkout",
  "/ordre/",
  "/fortryd/",
  "/enhed/",
  "/garanti/", // kun garanti-opslag med kode — /garanti (uden slash) er fortsat åben
  "/b2b/dashboard",
  "/b2b/login",
  "/b2b/registrer",
];

// Search engines and AI search/answer crawlers we explicitly want on the
// public pages. ChatGPT search and Copilot lean on Bing's index, Perplexity
// and Claude crawl themselves, Gemini/AI Overviews use Googlebot +
// Google-Extended, Siri/Apple Intelligence use Applebot(-Extended).
export const AI_AND_SEARCH_CRAWLERS = [
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Applebot",
  "Applebot-Extended",
  "DuckAssistBot",
  "CCBot",
];
