import Hashids from "hashids";

const hashids = new Hashids(process.env.HASHIDS_SALT, 10);
export const hash = (number: number) => hashids.encode(number);

const reverse = new Hashids(
  Array.from(process.env.HASHIDS_SALT!).reverse().join(""),
  10
);
export const reverseHash = (number: number) => reverse.encode(number);
