import * as fs from "fs";
import * as path from "path";
import * as util from "util";

import { ROCrateZipExplorer } from "./explorer";
import { describe, it, expect } from "vitest";

const readFile = util.promisify(fs.readFile);

describe("ROCrateZipExplorer", () => {
  it("openZipFile", async () => {
    const file = await getTestZipFile();
    const explorer = new ROCrateZipExplorer(file);
    const { crate } = await explorer.open();
    expect(crate).toBeDefined();
    expect(crate.context).toBe("https://w3id.org/ro/crate/1.1/context");
    expect(crate.graph).toBeDefined();
    expect(crate.graph.length).toBeGreaterThan(0);
  });
});

async function getTestZipFile() {
  const zipContents = await readFile(path.resolve(__dirname, "..", "test-data", "simple-invocation.rocrate.zip"));
  const file = new File([zipContents], "simple-invocation.rocrate.zip");
  return file;
}
