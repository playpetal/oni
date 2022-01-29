import sharp from "sharp";

export async function generateCollage(cards: sharp.Sharp[]) {
  const maxRows = 2;
  const maxColumns = 10;

  const generatedCards = cards.slice(0, maxRows * maxColumns);

  let columns;
  let rows;
  let h = 960;
  let w = 630;

  if (generatedCards.length <= 4) {
    columns = generatedCards.length;
    rows = 1;
  } else {
    columns = Math.ceil(generatedCards.length / 2);
    rows = 2;
  }

  const collage = sharp({
    create: {
      width: columns * w,
      height: rows * h,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  });

  const compositions: sharp.OverlayOptions[] = [];

  for (let card of generatedCards) {
    const row = Math.ceil((generatedCards.indexOf(card) + 1) / columns);
    let column =
      ((generatedCards
        .slice(columns * row - columns, columns * row)
        .indexOf(card) +
        1) /
        rows) *
      2;

    if (generatedCards.length <= 4) column = generatedCards.indexOf(card) + 1;

    const buf = await card.toBuffer();

    compositions.push({ input: buf, left: column * w - w, top: row * h - h });
  }

  collage.composite(compositions).png();

  /*********************************************************
   * sharp is pretty dumb and can't do this.               *
   * we'll have to figure something out later.             *
   * if (generatedCards.length > 4) {                      *
   *     collage.resize((w / 2) * columns, (h / 2) * rows);*
   * }                                                     *
   *********************************************************/

  return collage;
}
