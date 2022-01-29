import sharp from "sharp";
import { Stream } from "stream";
import { S3 } from "./S3";

export async function upload(instance: sharp.Sharp, key: string) {
  const url: string = await new Promise(async (res, rej) => {
    instance
      .pipe(await passthrough(key))
      .once("end", () => res(`https://cdn.playpetal.com/${key}`))
      .on("error", (e) => rej(e));
  });

  return url;
}

async function passthrough(key: string) {
  const pass = new Stream.PassThrough();

  const params: AWS.S3.PutObjectRequest = {
    Bucket: "petal",
    Key: key,
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
