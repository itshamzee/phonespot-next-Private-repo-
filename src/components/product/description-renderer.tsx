/**
 * Renders the plain-text product description from the database as typographic
 * structure. The DB format is: intro paragraphs, then sections consisting of a
 * heading line directly followed by "•"-bullets (see e.g. Foxway/laptop
 * templates). Descriptions without that structure fall back to paragraphs.
 */

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "section"; heading: string; items: string[] };

const BULLET = /^[•\-–]\s+/;

function parseDescription(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const collectBullets = () => {
      const items: string[] = [];
      while (i < lines.length && BULLET.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(BULLET, ""));
        i++;
      }
      return items;
    };

    if (BULLET.test(line)) {
      blocks.push({ kind: "section", heading: "", items: collectBullets() });
      continue;
    }

    const next = lines[i + 1]?.trim() ?? "";
    if (BULLET.test(next)) {
      i++;
      blocks.push({ kind: "section", heading: line, items: collectBullets() });
      continue;
    }

    blocks.push({ kind: "paragraph", text: line });
    i++;
  }

  return blocks;
}

/** "Label: value"-split for definition-style bullets; null when no label. */
function splitLabel(item: string): { label: string; value: string } | null {
  const idx = item.indexOf(": ");
  if (idx < 1 || idx > 40) return null;
  return { label: item.slice(0, idx), value: item.slice(idx + 2) };
}

function isSpecSection(heading: string): boolean {
  return heading.toLowerCase().startsWith("specifikation");
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="mt-0.5 h-4 w-4 shrink-0 text-[#1A3D2E]"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function DescriptionRenderer({ text }: { text: string }) {
  const blocks = parseDescription(text);
  let paragraphCount = 0;

  return (
    <div className="space-y-7">
      {blocks.map((block, bi) => {
        if (block.kind === "paragraph") {
          paragraphCount++;
          return (
            <p
              key={bi}
              className={
                paragraphCount === 1
                  ? "text-[17px] font-medium leading-relaxed text-[#111111]"
                  : "text-[15px] leading-relaxed text-[#3A3A3C]"
              }
            >
              {block.text}
            </p>
          );
        }

        if (isSpecSection(block.heading)) {
          return (
            <div key={bi}>
              <h3 className="mb-3 font-display text-lg font-bold text-[#111111]">
                {block.heading}
              </h3>
              <dl className="grid gap-x-10 sm:grid-cols-2">
                {block.items.map((item) => {
                  const pair = splitLabel(item);
                  return (
                    <div
                      key={item}
                      className="flex items-baseline justify-between gap-4 border-b border-[#E5E5EA]/80 py-2.5"
                    >
                      <dt className="shrink-0 text-[13px] text-[#86868B]">
                        {pair ? pair.label : ""}
                      </dt>
                      <dd className="text-right text-sm font-semibold text-[#111111]">
                        {pair ? pair.value : item}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          );
        }

        return (
          <div key={bi}>
            {block.heading && (
              <h3 className="mb-3 font-display text-lg font-bold text-[#111111]">
                {block.heading}
              </h3>
            )}
            <ul
              className={`grid gap-x-8 gap-y-2 ${
                block.items.length >= 4 ? "sm:grid-cols-2" : ""
              }`}
            >
              {block.items.map((item) => {
                const pair = splitLabel(item);
                return (
                  <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed">
                    <CheckIcon />
                    <span className="text-[#3A3A3C]">
                      {pair ? (
                        <>
                          <span className="font-semibold text-[#111111]">
                            {pair.label}:
                          </span>{" "}
                          {pair.value}
                        </>
                      ) : (
                        item
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
