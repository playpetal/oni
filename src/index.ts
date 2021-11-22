require("dotenv").config();
import { buildCard } from "./lib/buildCard";
import { test } from "./lib/test/test";
import express from "express";
import imageType from "image-type";
import { isUrl } from "./lib/isUrl";
import axios from "axios";
import sharp from "sharp";

const args = process.argv.slice(2).map((a) => a.toLowerCase());

if (args[0] === "test") {
  let rounds = parseInt(args[2], 10);
  if (isNaN(rounds)) rounds = 100;

  switch (args[1]) {
    case "draw": {
      test(
        buildCard,
        [
          "#EEC965",
          "./src/assets/test/hyunjin.png",
          args[3] || "HyunJin",
          Date.now(),
          { noUpload: true, toFile: true },
        ],
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
    const {
      image,
      input,
      id,
      name,
    }: { image: string; id: number; input: string; name: string } = req.body;

    if (!image || !isUrl(image))
      return res
        .status(400)
        .send({ error: "'image' must be a url", image: null });

    if (!input || (!isUrl(input) && !/^#[0-9A-F]{6}$/i.test(input)))
      return res.status(400).send({
        error: "'input' must be a hex code or url",
        image: null,
      });

    if (!id || isNaN(id) || typeof id !== "number" || id < 0)
      return res
        .status(400)
        .send({ error: "'id' must be a valid number above zero", image: null });

    const imageRequest = await axios.get(image, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(imageRequest.data, "binary");
    const imageBufferType = imageType(imageBuffer);

    if (imageBufferType?.ext !== "png" && imageBufferType?.ext !== "jpg")
      return res
        .status(400)
        .send({ error: "'image' must be a url to a valid .png or .jpeg" });

    const fixedImage = await sharp(imageBuffer).resize(494, 710).toBuffer();

    let fixedInput: Buffer | string = input;

    if (isUrl(input)) {
      const inputRequest = await axios.get(input, {
        responseType: "arraybuffer",
      });
      const inputBuffer = Buffer.from(inputRequest.data, "binary");
      const inputBufferType = imageType(inputBuffer);

      if (inputBufferType?.ext !== "png" && inputBufferType?.ext !== "jpg")
        return res
          .status(400)
          .send({ error: "'input' must be a url to a valid .png or .jpeg" });

      fixedInput = await sharp(inputBuffer).resize(630, 960).toBuffer();
    }

    try {
      const url = await buildCard(fixedInput, fixedImage, name || "", id);
      return res.send({ error: null, image: url });
    } catch (e) {
      console.log(e);
      return res
        .status(500)
        .send({ error: "An unexpected error occurred.", image: null });
    }
  });

  app.listen(3000, () => console.log("Listening!"));
}
