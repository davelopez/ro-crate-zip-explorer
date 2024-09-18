import * as fs from "fs";
import * as path from "path";
import * as util from "util";

import { ROCrateZipExplorer } from "./explorer";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const readFile = util.promisify(fs.readFile);

describe("ROCrateZipExplorer", () => {
  it("openZipFile", async () => {
    const explorer = new ROCrateZipExplorer();

    const file = await getTestZipFile();

    const metadata = await explorer.openZipFile(file);

    expect(metadata).toBeDefined();
    expect(metadata["@context"]).toBe("https://w3id.org/ro/crate/1.1/context");
    expect(metadata["@graph"]).toBeDefined();
    expect(metadata["@graph"].length).toBeGreaterThan(0);
  });
});

async function getTestZipFile() {
  const zipContents = await readFile(path.resolve(__dirname, "..", "test-data", "simple-invocation.rocrate.zip"));
  const file = new File([zipContents], "simple-invocation.rocrate.zip");
  return file;
}
