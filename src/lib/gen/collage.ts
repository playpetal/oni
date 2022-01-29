import sharp from "sharp";
import { generateLayers } from "./generateCard";

export async function generateCollage(
  cards: {
    frame: string;
    character: Buffer;
    name: string;
    id: number;
  }[]
) {
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

  const layers: sharp.OverlayOptions[] = [
    {
      input: "./src/assets/clip_mask.png",
      left: 0,
      top: 0,
      tile: true,
    },
  ];

  const cardLayers: sharp.OverlayOptions[] = [];

  const framesCollage = sharp({
    create: {
      width: columns * w,
      height: rows * h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const frames: sharp.OverlayOptions[] = [];

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

    let frame = {
      create: {
        background: `${card.frame}`,
        height: 960,
        width: 630,
        channels: 4 as const,
      },
    };

    frames.push({ input: frame, left: column * w - w, top: row * h - h });

    const _cardLayers = generateLayers(
      card.frame,
      card.name,
      card.character,
      column * w - w,
      row * h - h
    );

    cardLayers.push(..._cardLayers);
  }

  /*********************************************************
   * sharp is pretty dumb and can't do this.               *
   * we'll have to figure something out later.             *
   * if (generatedCards.length > 4) {                      *
   *     collage.resize((w / 2) * columns, (h / 2) * rows);*
   * }                                                     *
   *********************************************************/

  const framesBuffer = await framesCollage.composite(frames).jpeg().toBuffer();

  layers.push({ input: framesBuffer, left: 0, top: 0, blend: "in" });

  collage.composite([...layers, ...cardLayers]);

  return collage.png();
}
