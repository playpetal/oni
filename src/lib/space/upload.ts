import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { S3 } from "./S3";

export async function upload(body: Buffer, key: string) {
  const params: PutObjectCommandInput = {
    Bucket: "petal",
    Key: key,
    ContentType: "image/png",
    ACL: "public-read",
    Body: body,
  };

  const cmd = new PutObjectCommand(params);
  await S3.send(cmd);

  return `https://cdn.playpetal.com/${key}`;
}

/*export async function uploadMultipart(instance: sharp.Sharp, key: string) {
  const params: CreateMultipartUploadCommandInput = {
    Bucket: "petal",
    Key: key,
    ContentType: "image/png",
    ACL: "public-read",
  };
  const upload = new CreateMultipartUploadCommand(params);
  const response = await S3.send(upload);

  let part = 0;

  instance.on("readable", async () => {
    let chunk = instance.read();
    while (chunk != null) {
      const currentPart = ++part;

      const uploadParams: UploadPartCommandInput = {
        Bucket: "petal",
        Key: key,
        PartNumber: currentPart,
        UploadId: response.UploadId!,
        Body: chunk,
        ContentLength: chunk.length,
      };

      const upload = new UploadPartCommand(uploadParams);
      await S3.send(upload);
    }
  });

  instance.on("end", async () => {
    const partsParams: ListPartsCommandInput = {
      Bucket: "petal",
      Key: key,
      UploadId: response.UploadId!,
    };

    const partsCommand = new ListPartsCommand(partsParams);
    const parts = await S3.send(partsCommand);

    const completeParams: CompleteMultipartUploadCommandInput = {
      Bucket: "petal",
      Key: key,
      UploadId: response.UploadId,
      MultipartUpload: parts,
    };

    const complete = new CompleteMultipartUploadCommand(completeParams);
    await S3.send(complete);
  });

  return `https://cdn.playpetal.com/${key}`;
}*/
