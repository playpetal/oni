import sharp from "sharp";

export function generateCard(
  frame: Buffer | string, // buffer or HEX
  character: Buffer | string, // buffer or FILEPATH
  name: string,
  { left, top }: { left?: number; top?: number }
): sharp.Sharp {
  const base = sharp({
    create: {
      background: { r: 0, g: 0, b: 0, alpha: 1 },
      height: 960,
      width: 630,
      channels: 4,
    },
  });

  const l = left || 0;
  const t = top || 0;

  base.composite([
    {
      input: "./src/assets/clip_mask.png",
      left: 0,
      top: 0,
      tile: true,
    },
    ...generateLayers(frame, name, character, l, t),
  ]);

  return base;
}

export function generateLayers(
  _frame: string | Buffer,
  name: string,
  character: string | Buffer,
  l: number,
  t: number
): sharp.OverlayOptions[] {
  const [defaultFontSize, defaultTextHeight] = [104, 75];
  const charsPerLine = 7; // name length at which to shrink and re-center the text
  let fontSize = defaultFontSize; // final font size of the text, 104 is the default
  let offset = 0; // negative Y offset of the text
  let stroke = 11; // stroke width of the text, 11 is the default

  if (name.length > charsPerLine) {
    const em = charsPerLine / name.length; // the new font size will be 'em' em of the base font size
    fontSize *= em; // set the new font size to 'em' em

    // ratio of default text height(px) to default font size, always ≈0.721153846
    const heightRatio = defaultTextHeight / defaultFontSize;
    const newTextHeight = fontSize * heightRatio;

    offset = (defaultTextHeight - newTextHeight) / 2;

    /*const strokeRatio = stroke / defaultFontSize;
      stroke = strokeRatio * fontSize;*/
  }

  //@ts-ignore
  const text = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 960" version="1.1">
        <text 
            font-size="${fontSize}px" x="75" y="${883 - offset}" fill="#FFFFFF"
            style="stroke:#000000; stroke-width:${stroke}px;"
            font-family="Junegull"
            paint-order="stroke"
            stroke-miterlimit="0"
        >
            ${name}
        </text>
    </svg>`
  );

  return [
    /*{ input: text, left: l, top: t },
    { input: "./src/assets/top_shadow.png", left: l, top: t },
    {
      input: "./src/assets/outline.png",
      left: l,
      top: t,
      blend: "dest-over",
    },
    {
      input: "./src/assets/drop_shadow.png",
      left: l,
      top: t,
      blend: "dest-over",
    },*/
    {
      input: character,
      left: l + 68,
      top: t + 68,
      blend: "dest-over",
      gravity: "northwest",
    },
  ];
}
