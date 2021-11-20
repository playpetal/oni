import AWS from "aws-sdk";

export const S3 = new AWS.S3({
  endpoint: "nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: "PYANQLRGPEY2ITBBB4N3",
    secretAccessKey: "c7ZqRQHx5mk+4d9qrxFukgcw96AVioQVEz+AELtR20o",
  },
});
