require("dotenv").config();
import { test } from "./lib/test/test";
import express from "express";
import imageType from "image-type";
import { isUrl } from "./lib/isUrl";
import axios from "axios";
import sharp from "sharp";
import { S3 } from "./lib/space/S3";
import { hash, reverseHash } from "./lib/hash";
import { validateCardJSON } from "./lib/validate";
import { generateCard } from "./lib/gen/generateCard";
import { generateCollage } from "./lib/gen/collage";
import { upload } from "./lib/space/upload";

if (
  !process.env.S3_ENDPOINT ||
  !process.env.S3_ACCESS_KEY ||
  !process.env.S3_SECRET_KEY
)
  throw new Error("Missing S3 credentials");

const args = process.argv.slice(2).map((a) => a.toLowerCase());

if (args[0] === "test") {
  let rounds = parseInt(args[2], 10);
  if (isNaN(rounds)) rounds = 100;

  switch (args[1]) {
    case "draw": {
      test(
        generateCard,
        ["#EEC965", "./src/assets/test/hyunjin.png", args[3] || "HyunJin"],
        rounds,
        "Draw"
      );
      break;
    }
    default: {
      console.log("Please specify a function to test: draw");
      break;
    }
  }
} else {
  const app = express();
  app.use(express.json({ limit: "20000000" }));

  app.get("/health", async (_req, res) => {
    return res.status(200).send({ message: "OK" });
  });

  app.get("/card", async (req, res) => {
    const card = req.body as {
      frame: string;
      character: string;
      name: string;
      id: number;
    };

    const isValid = validateCardJSON(card);

    if (!isValid)
      return res
        .status(400)
        .json({ error: "'body' must be a valid card object", url: null });

    if (!isUrl(card.character))
      return res
        .status(400)
        .send({ error: "'character' must be a url", url: null });

    if (!isUrl(card.frame) && !/^#[0-9A-F]{6}$/i.test(card.frame))
      return res.status(400).send({
        error: "'input' must be a hex code or url",
        url: null,
      });

    if (isNaN(card.id) || typeof card.id !== "number" || card.id < 0)
      return res
        .status(400)
        .send({ error: "'id' must be a valid number above zero", url: null });

    const characterReq = await axios.get(card.character, {
      responseType: "arraybuffer",
    });
    const characterBuf = Buffer.from(characterReq.data, "binary");
    const characterType = imageType(characterBuf);

    if (characterType?.ext !== "png" && characterType?.ext !== "jpg")
      return res.status(400).send({
        error: "'image' must be a url to a valid .png or .jpeg",
        url: null,
      });

    const character = await sharp(characterBuf).resize(494, 710).toBuffer();
    let frame: Buffer | string = card.frame;

    if (isUrl(card.frame)) {
      const frameReq = await axios.get(card.frame, {
        responseType: "arraybuffer",
      });
      const frameBuf = Buffer.from(frameReq.data, "binary");
      const frameType = imageType(frameBuf);

      if (frameType?.ext !== "png" && frameType?.ext !== "jpg")
        return res.status(400).send({
          error: "'input' must be a url to a valid .png or .jpeg",
          url: null,
        });

      frame = await sharp(frameBuf).resize(630, 960).toBuffer();
    }

    try {
      const instance = generateCard(frame, character, card.name);

      const key = hash(card.id);
      const url = await upload(
        instance,
        `${process.env.BUCKET_PREFIX || ""}card/${key}.png`
      );

      return res.send({ url, error: null });
    } catch (e) {
      console.log(e);
      return res
        .status(500)
        .send({ error: "An unexpected error occurred.", url: null });
    }
  });

  app.post("/upload", async (req, res) => {
    if (!req.body?.url || !req.body?.id)
      return res.status(400).send({ error: "invalid body" });

    const key = reverseHash(req.body.id as number);

    const image = (
      await axios.get(req.body.url!, { responseType: "arraybuffer" })
    ).data;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: "petal",
      Key: `${process.env.BUCKET_PREFIX || ""}p/${key}.png`,
      Body: image,
      ContentType: "image/png",
      ACL: "public-read",
    };

    S3.upload(params, (err, data) => {
      if (err) return res.status(400).send({ error: err.message });
      return res.status(200).send({ url: data.Location });
    });
  });

  app.get("/collage", async (req, res) => {
    const cards = req.body as {
      frame: string;
      character: string;
      name: string;
      id: number;
    }[];

    if (!Array.isArray(cards))
      return res
        .status(400)
        .json({ url: null, error: "'body' must be an array of cards" });

    for (let card of cards) {
      const isValid = validateCardJSON(card);

      if (!isValid)
        return res.status(400).json({
          url: null,
          error: `entry ${cards.indexOf(
            card
          )} of 'body' has invalid properties`,
        });
    }

    const sharps: sharp.Sharp[] = [];

    for (let card of cards) {
      const inputRequest = await axios.get(card.character, {
        responseType: "arraybuffer",
      });
      const inputBuffer = Buffer.from(inputRequest.data, "binary");

      sharps.push(generateCard(card.frame, inputBuffer, card.name));
    }

    const collage = await generateCollage(sharps);
    const key = hash(Date.now());

    const url = await upload(
      collage,
      `${process.env.BUCKET_PREFIX || ""}c/${key}.png`
    );

    return res.status(200).json({ url, error: null });
  });

  app.get("/hash", (req, res) => {
    if (
      !req.headers.authorization ||
      req.headers.authorization !== process.env.SHARED_SECRET
    )
      return res
        .status(401)
        .json({ hash: null, error: "You are not authorized to do that." });

    if (
      !req.body.id ||
      typeof req.body.id !== "number" ||
      isNaN(req.body.id) ||
      req.body.id < 1
    )
      return res
        .status(400)
        .json({ hash: null, error: "'id' must be a number above 0." });

    return res
      .status(200)
      .json({ hash: reverseHash(req.body.id), error: null });
  });

  app.listen(process.env.PORT || 3000, () => console.log("Listening!"));
}
