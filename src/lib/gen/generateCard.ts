import sharp from "sharp";
import { spawn } from "child_process";
import { Writable } from "stream";

export async function generateCard(
  cards: {
    frame: string;
    character: string;
    name: string;
  }[]
) {
  const buffers: Buffer[] = [];

  const writable = new Writable({
    write(chunk, _encoding, callback) {
      buffers.push(chunk);
      callback();
    },
  });

  const inputs = [
    "-i ./assets/clip_mask.png",
    "-i ./assets/outline.png",
    "-i ./assets/top_shadow.png",
    "-i ./assets/drop_shadow.png",
  ];

  const filters = [];
  const finals = [];
  let pass = 0;

  for (let card of cards) {
    inputs.push(`-f lavfi -i color=${card.frame}:630x960`);
    inputs.push(`-i ${card.character}`);
    filters.push(
      generateFilters(
        card.name,
        pass,
        inputs.length - 2,
        inputs.length - 1,
        cards.length > 1
      )
    );
    if (cards.length > 1) finals.push(`[final${pass}]`);
    pass++;
  }

  if (cards.length > 1)
    filters.push(
      `${finals.join("")}xstack=inputs=${cards.length}:layout=${getXstackLayout(
        cards.length
      )}`
    );

  const child = spawn("ffmpeg", [
    "-loglevel",
    "error",
    "-hide_banner",
    ...inputs.map((i) => i.split(" ")).flat(),
    "-filter_complex",
    filters.join(";"),
    "-frames:v",
    "1",
    "-c:v",
    "png",
    "-f",
    "image2",
    "pipe:1",
  ]);

  child.stdout.pipe(writable);
  child.stderr.on("data", (data) => {
    console.log(data.toString());
  });

  const buf: Buffer = await new Promise((res, rej) => {
    writable.on("close", () => {
      res(Buffer.concat(buffers));
    });
  });

  return buf;
}

function getXstackLayout(num: number) {
  return "0_0|w0_0|w0+w1_0|w0+w1+w2_0|w0+w1+w2+w3_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0|w0+w1+w2+w3_h0"
    .split("|")
    .slice(0, num)
    .join("|");
}

export function generateFilters(
  name: string,
  pass: number,
  frameInput: number,
  charInput: number,
  appendOutput: boolean = true
) {
  const { fontSize, stroke, offset } = getTextSize(name);

  return (
    `[0:v]alphaextract[alpha${pass}];` +
    `[${frameInput}][alpha${pass}]alphamerge[frame${pass}];` +
    `[1][frame${pass}] overlay=format=auto[card${pass}];` +
    `[${charInput}] scale,format=rgba,pad=630:960:(ow-iw)/2:72:color=black@0 [char${pass}];` +
    `[char${pass}][card${pass}] overlay=format=auto[card2${pass}];` +
    `[card2${pass}] drawtext=fontfile=./assets/Junegull.ttf:text='${name}':fontcolor=white:fontsize=${fontSize}:x=80:y=${
      810 + offset
    }:bordercolor=black:borderw=${stroke} [card3${pass}];` +
    `[card3${pass}][2] overlay=format=auto [finalcard${pass}];` +
    `[3][finalcard${pass}] overlay=format=auto [unscaled${pass}];` +
    `[unscaled${pass}] scale=320:-1 ${appendOutput ? `[final${pass}]` : ``}`
  );
}

export function getTextSize(name: string): {
  fontSize: number;
  stroke: number;
  offset: number;
} {
  const [defaultFontSize, defaultTextHeight] = [104, 75];
  const charsPerLine = 7; // name length at which to shrink and re-center the text
  let fontSize = defaultFontSize; // final font size of the text, 104 is the default
  let offset = 0; // negative Y offset of the text
  let stroke = 5; // stroke width of the text, 5 is the default

  if (name.length > charsPerLine) {
    const em = charsPerLine / name.length; // the new font size will be 'em' em of the base font size
    fontSize *= em; // set the new font size to 'em' em

    // ratio of default text height(px) to default font size, always ≈0.721153846
    const heightRatio = defaultTextHeight / defaultFontSize;
    const newTextHeight = fontSize * heightRatio;

    offset = (defaultTextHeight - newTextHeight) / 2;
  }

  return { fontSize, stroke, offset };
}
