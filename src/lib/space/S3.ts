import { S3Client } from "@aws-sdk/client-s3";

export const S3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

S3.middlewareStack.add(
  (next, _context) => (args: any) => {
    if (
      args.request &&
      args.request.body &&
      args.request.body.includes("CompletedMultipartUpload")
    ) {
      args.request.body = args.request.body.replace(
        /CompletedMultipartUpload/g,
        "CompleteMultipartUpload"
      );
    }
    return next(args);
  },
  {
    step: "build",
    priority: "high",
  }
);
