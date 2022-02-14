import { spawn } from "child_process";
import { Writable } from "stream";
import { getLetter } from "../dict";

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
    if (card.frame.startsWith("#")) {
      inputs.push(`-f lavfi -i color=${card.frame}:630x960`);
    } else {
      inputs.push(`-i ${card.frame}`);
    }
    inputs.push(`-i ${card.character}`);
    filters.push(
      generateFilters(
        card.name,
        pass,
        inputs.length - 2,
        inputs.length - 1,
        1 / Math.ceil(cards.length / 2),
        cards.length > 1
      )
    );
    if (cards.length > 1) finals.push(`[final${pass}]`);
    pass++;
  }

  if (cards.length > 1) {
    const xstack = getXstackLayout(cards.length);
    filters.push(
      `${finals.join("")}xstack=inputs=${cards.length}:layout=${xstack}`
    );
  }

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
  let base = "0_0|w0_0|w0+w1_0|w0+w1+w2_0";

  if (num <= 4) {
    return base.split("|").slice(0, num).join("|");
  }

  if (num <= 6) {
    base = base.split("|").slice(0, 3).join("|");
    base += "|0_h0|w0_h0";
    if (num === 6) base += "|w0+w1_h0";
    return base;
  }

  if (num <= 8) {
    base += "|0_h0|w0_h0|w0+w1_h0";
    if (num === 8) base += "|w0+w1+w2_h0";
    return base;
  }

  if (num <= 10) {
    base += "|w0+w1+w2+w3_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0";
    if (num === 10) base += "|w0+w1+w2+w3_h0";
    return base;
  }

  return base;
}

export function generateFilters(
  name: string,
  pass: number,
  frameInput: number,
  charInput: number,
  scaleX: number,
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
    `[unscaled${pass}] scale=${630 * scaleX}:-1 ${
      appendOutput ? `[final${pass}]` : ``
    }`
  );
}

export function getTextSize(name: string): {
  fontSize: number;
  stroke: number;
  offset: number;
} {
  const maxWidth = 468; // max width in px of the text
  let fontSize = 104; // final font size of the text
  let stroke = 5; // stroke width of the text
  let multiplier = 1;

  let { width, offset } = calculateSize(name, 1);

  while (width > maxWidth) {
    multiplier = Number((multiplier - 0.025).toFixed(3));

    const size = calculateSize(name, multiplier);
    width = size.width;
    offset = size.offset;
  }

  if (multiplier < 1) {
    fontSize = Math.round(multiplier * fontSize);

    // ratio of default text height(px) to default font size, always ≈0.721153846
    const heightRatio = 73 / 104;
    const newTextHeight = Math.ceil(fontSize * heightRatio);

    offset += (73 - newTextHeight) / 2;
  }

  return { fontSize, stroke, offset };
}

function calculateSize(
  str: string,
  mult: number
): { width: number; offset: number } {
  let finalWidth = 0;
  let finalOffset = 0;

  for (let s of str) {
    const { width, offset, leftPad, rightPad } = getLetter(s);
    finalWidth += Number((mult * (leftPad + rightPad + width)).toFixed(3));

    if (offset && finalOffset > offset)
      finalOffset = Number((mult * offset).toFixed(3));
  }

  console.log(finalOffset);
  return { width: Math.round(finalWidth), offset: Math.round(finalOffset) };
}
