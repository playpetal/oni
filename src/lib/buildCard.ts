import sharp from "sharp";
import { Stream } from "stream";
import { S3 } from "./space/S3";
import { hash } from "./hash";

export async function buildCard(
  frame: Buffer | string, // buffer or HEX
  character: Buffer | string, // buffer or FILEPATH
  name: string,
  id: number,
  options?: { noUpload?: boolean; toFile?: boolean }
): Promise<string | undefined> {
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

  let frameInput: { create: sharp.Create } | Buffer;

  if (typeof frame === "string") {
    frameInput = {
      create: { background: `${frame}`, height: 960, width: 630, channels: 4 },
    };
  } else frameInput = frame;

  const clipMask = sharp("./src/assets/clip_mask.png");

  clipMask.composite([
    {
      input: frameInput,
      left: 0,
      top: 0,
      blend: "in",
    },
    { input: text, left: 0, top: 0 },
    { input: "./src/assets/top_shadow.png", left: 0, top: 0 },
    {
      input: "./src/assets/outline.png",
      left: 0,
      top: 0,
      blend: "dest-over",
    },
    {
      input: "./src/assets/drop_shadow.png",
      left: 0,
      top: 0,
      blend: "dest-over",
    },
    {
      input: character,
      left: 68,
      top: 68,
      blend: "dest-over",
      gravity: "northwest",
    },
  ]);

  const key = hash(id);

  if (options?.toFile) {
    await clipMask.toFile(`./out/${key}.png`);
  }

  if (options?.noUpload) return;

  await new Promise(async (res, rej) =>
    clipMask
      .pipe(await upload(key))
      .once("end", () => res(undefined))
      .on("error", (e) => rej(e))
  );

  return `https://cdn.playpetal.com/mockcard/${key}.png`;
}

async function upload(key: string) {
  const pass = new Stream.PassThrough();

  const params: AWS.S3.PutObjectRequest = {
    Bucket: "petal",
    Key: `mockcard/${key}.png`,
    Body: pass,
    ContentType: "image/png",
    ACL: "public-read",
  };

  S3.upload(params, (err: any, data: any) => {
    if (err) throw err;
    return data.location;
  });

  return pass;
}
