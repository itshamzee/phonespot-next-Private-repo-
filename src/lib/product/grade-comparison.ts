/**
 * Picks which grade to show the customer as "spar X kr. vs. Grade Y" on the
 * device PDP. Must never point at a grade that isn't in stock — since the
 * grade selector only renders grades with `available > 0`, comparing against
 * a sold-out grade would reference something invisible on the page.
 */

export type GradeAvailability = {
  grade: string;
  price: number | null;
  available: number;
};

/**
 * Finds the nearest higher-ranked ("better") grade that is actually in
 * stock right now.
 *
 * `grades` must be ordered best-to-worst (e.g. N, P, A, B, C) — the same
 * order `availableGrades` is built in on the device PDP. Walks backwards
 * from the selected grade towards the best grade, skipping any sold-out
 * grade along the way, and returns the first one with stock. Returns `null`
 * when the selected grade is already the best available, or when every
 * better-ranked grade is sold out.
 */
export function pickBetterInStockGrade(
  grades: GradeAvailability[],
  selectedGrade: string,
): GradeAvailability | null {
  const selectedIdx = grades.findIndex((g) => g.grade === selectedGrade);
  if (selectedIdx <= 0) return null;

  for (let i = selectedIdx - 1; i >= 0; i--) {
    if (grades[i].available > 0) return grades[i];
  }

  return null;
}
