export function getLetter(letter: string): {
  width: number;
  offset: number;
  leftPad: number;
  rightPad: number;
} {
  return dict[letter.toUpperCase() as keyof typeof dict] || { width: 55 };
}

function entry(
  w: number,
  leftPad?: number,
  rightPad?: number,
  offset?: number
): { width: number; offset: number; leftPad: number; rightPad: number } {
  return {
    width: w,
    offset: offset || 0,
    leftPad: leftPad || 0,
    rightPad: rightPad || 0,
  };
}

const dict = {
  A: entry(73, 2, 1),
  B: entry(59, 4, 5),
  C: entry(55),
  D: entry(59, 4, 2),
  E: entry(55, 4, 4),
  F: entry(55),
  G: entry(55, 2),
  H: entry(57, 4, 4),
  I: entry(21, 4, 3),
  J: entry(49),
  K: entry(56),
  L: entry(41),
  M: entry(71),
  N: entry(57, 4, 4),
  O: entry(76, 2, 3),
  P: entry(56),
  Q: entry(75),
  R: entry(57),
  S: entry(54),
  T: entry(55),
  U: entry(60, 3, 4),
  V: entry(68),
  W: entry(95, 3),
  X: entry(55),
  Y: entry(57, 1, 1),
  Z: entry(60),
  " ": entry(24, 0, 0),
  É: entry(55, 4, 4, -17),
} as const;
