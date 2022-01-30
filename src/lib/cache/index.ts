import axios from "axios";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export async function requestCharacterFile(character: string): Promise<Buffer> {
  const filename = character.split("/").pop()!;

  const filepath = path.join("./cache", filename);
  try {
    return await readFile(filepath);
  } catch (e) {
    const inputRequest = await axios.get(character, {
      responseType: "arraybuffer",
    });

    let buf = Buffer.from(inputRequest.data, "binary");
    const metadata = await sharp(buf).metadata();
    if (metadata.height !== 708 || metadata.width !== 494) {
      buf = await sharp(buf).resize(494, 708).toBuffer();
    }

    await writeFile(filepath, buf);
    return buf;
  }
}
