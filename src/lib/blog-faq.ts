/**
 * Læser FAQ-afsnittet i et blogindlæg ("## Ofte stillede spørgsmål" med
 * "### Spørgsmål" og svar som almindelige afsnit) og returnerer det som
 * spørgsmål og svar til FAQPage-schema. Teksten står allerede synligt i
 * indlægget, så schemaet beskriver kun det, læseren kan se.
 *
 * Markdown fjernes fra svaret: links bliver til deres tekst, fed/kursiv og
 * citat-tegn forsvinder, og JSX-blokke springes over.
 */
export type BlogFaq = { question: string; answer: string };

const FAQ_HEADING = /^##\s+(ofte stillede spørgsmål|faq|spørgsmål og svar)\b/i;

function plain(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractBlogFaq(content: string): BlogFaq[] {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((l) => FAQ_HEADING.test(l.trim()));
  if (start < 0) return [];

  const out: BlogFaq[] = [];
  let question: string | null = null;
  let answer: string[] = [];
  let inJsx = false;

  const flush = () => {
    if (question) {
      const text = plain(answer.join("\n"));
      if (text) out.push({ question: plain(question), answer: text });
    }
    question = null;
    answer = [];
  };

  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    if (/^##\s/.test(line) || /^---+$/.test(line)) break;
    if (/^###\s+/.test(line)) {
      flush();
      question = line.replace(/^###\s+/, "");
      continue;
    }
    if (/^<[A-Za-z]/.test(line)) inJsx = !/\/>\s*$/.test(line) && !/<\/[A-Za-z]+>\s*$/.test(line);
    else if (inJsx && /<\/[A-Za-z]+>\s*$/.test(line)) {
      inJsx = false;
      continue;
    }
    if (inJsx || /^<|^\{/.test(line) || /^\|/.test(line)) continue;
    if (question) answer.push(raw);
  }
  flush();
  return out;
}
