import Hashids from "hashids";

const hashids = new Hashids(process.env.HASHIDS_SALT, 10);
export const hash = (number: number) => hashids.encode(number);
