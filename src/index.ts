require("dotenv").config();
import { test } from "./lib/test/test";
import express from "express";
import axios from "axios";
import { reverseHash } from "./lib/hash";
import { generateCard } from "./lib/gen/generateCard";
import { upload } from "./lib/space/upload";
import { recache, requestFile } from "./lib/cache";
import path from "path";
import { mkdir } from "fs/promises";

mkdir("./cache/c", { recursive: true });
mkdir("./cache/f", { recursive: true });

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

  app.post("/card", async (req, res) => {
    const cardData = req.body as {
      frame: string;
      character: string;
      name: string;
      id: number;
    }[];

    const cards: {
      frame: string;
      character: string;
      name: string;
      id: number;
    }[] = [];

    try {
      for (let card of cardData) {
        const character = await requestFile(card.character, 708, 494, "/c");

        if (card.frame.startsWith("#")) {
          cards.push({ ...card, character });
        } else {
          const frame = await requestFile(card.frame, 960, 630, "/f");
          cards.push({ ...card, character, frame });
        }
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ card: "" });
    }

    const image = await generateCard(cards);

    return res.json({ card: image.toString("base64") });
  });

  app.post("/upload", async (req, res) => {
    if (!req.body?.url || !req.body?.id)
      return res.status(400).send({ error: "invalid body" });

    const key = reverseHash(req.body.id as number);

    const image = (
      await axios.get(req.body.url!, { responseType: "arraybuffer" })
    ).data;

    await upload(image, `${process.env.BUCKET_PREFIX || ""}p/${key}.png`);
    await recache(path.join("./cache/c", `${key}.png`), image, 960, 630);

    return res.status(200).send({
      url: `https://cdn.playpetal.com/${
        process.env.BUCKET_PREFIX || ""
      }p/${key}.png`,
    });
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
