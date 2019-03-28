import process from "process";
import path from "path";
import fs from "fs";

export const getPackage = directory => {
  try {
    const file = fs.readFileSync(path.join(directory, "package.json"));
    return JSON.parse(file);
  } catch (_) {
    return null;
  }
};

export const findPackage = _ => {
  let directory = process.cwd();
  while (directory) {
    try {
      const pkg = getPackage(directory);
      if (pkg) {
        return pkg;
      }
      directory = path.basename(directory);
    } catch (_) {
      return {}; // default, not found
    }
  }
};

const pkg = findPackage();
const { name, version, build } = pkg;

export const packageBase = { name, version, build };

export default pkg;
