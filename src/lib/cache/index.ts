import axios from "axios";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export async function requestFile(
  url: string,
  h: number,
  w: number,
  cacheLoc?: string
): Promise<string> {
  const filename = url.split("/").pop()!;

  const filepath = path.join(`./cache${cacheLoc || ""}`, filename);
  try {
    await readFile(filepath);
    return filepath;
  } catch (e) {
    const request = await axios.get(url, {
      responseType: "arraybuffer",
    });

    let buf = Buffer.from(request.data, "binary");
    const metadata = await sharp(buf).metadata();

    if (metadata.height !== h || metadata.width !== w) {
      buf = await sharp(buf).resize(w, h).toBuffer();
    }

    await writeFile(filepath, buf);
    return filepath;
  }
}

export async function recache(
  filepath: string,
  image: Buffer,
  h: number,
  w: number
): Promise<string> {
  const metadata = await sharp(image).metadata();
  if (metadata.height !== h || metadata.width !== w) {
    image = await sharp(image).resize(w, h).toBuffer();
  }

  await writeFile(filepath, image);
  return filepath;
}
