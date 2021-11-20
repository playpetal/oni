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
  const text = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 960" version="1.1">
        <text 
            font-size="104px" x="75" y="883" fill="#FFFFFF"
            style="stroke:#000000; stroke-width:11px;"
            font-family="Junegull"
            paint-order="stroke"
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
    await clipMask.toFile(`./${key}.png`);
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
