import { assert, beforeAll, describe, it } from "vitest";
import { ROCrateZipExplorer } from "../src";
import type { ROCrateImmutableView } from "../src/types/ro-crate-interfaces";
import { testFileProvider } from "./testUtils";

/**
 * This test file specifically explores the cwltool-runcrate.zip archive
 * which contains many file entities with alternateName properties.
 *
 * The cwltool-runcrate.zip is a real-world RO-Crate generated from
 * CWL tool execution that includes alternative names for files.
 *
 * Example entity with alternateName:
 * {
 *   "@id": "c7398fbf741b851e80ae731d60cbee9258ff81f3/d4061bed85711676d337bd8835e32413957485e3",
 *   "@type": "File",
 *   "alternateName": "Mirax2-Fluorescence-2/Data0017.dat",
 *   "sha1": "d4061bed85711676d337bd8835e32413957485e3"
 * }
 *
 * RUN: vitest cwltool-runcrate-alternate-names.test.ts --reporter=verbose
 */
describe("CWLTool RO-Crate Alternate Names", async () => {
  let explorer: ROCrateZipExplorer;
  let crate: ROCrateImmutableView;

  beforeAll(async () => {
    const testFile = await testFileProvider.local("cwltool-runcrate.zip");
    explorer = new ROCrateZipExplorer(testFile.source);
    await explorer.open();
    await explorer.extractMetadata();
    crate = explorer.crate;
  });

  describe("Archive Structure", () => {
    it("should open the cwltool-runcrate.zip archive", () => {
      console.log("\n📦 CWLTOOL RUNCRATE ARCHIVE");
      console.log(`  ZIP size: ${explorer.zipArchive.size} bytes`);
      console.log(`  Total entries: ${explorer.zipArchive.entries.size}`);
      console.log(`  Is RO-Crate: ${explorer.hasCrate}`);
    });

    it("should have the correct number of entries", () => {
      const expectedEntries = 34;
      const actualEntries = explorer.zipArchive.entries.size;

      console.log(`\n✓ Entry count: ${actualEntries} (expected: ${expectedEntries})`);
      assert.equal(actualEntries, expectedEntries);
    });

    it("should contain RO-Crate metadata", () => {
      console.log("\n📄 RO-CRATE METADATA");
      console.log(`  Total entities in graph: ${crate.graphSize}`);
      console.log(`  Root ID: ${crate.rootId}`);
      console.log(`  Root Dataset: ${crate.rootDataset?.["@id"]}`);
    });
  });

  describe("Alternate Names (alternateName property)", () => {
    it("should find files with alternateName property", () => {
      const filesWithAltName = crate.graph.filter(
        (entity) => entity["@type"] === "File" && entity.alternateName,
      );

      console.log(`\n🏷️  FILES WITH ALTERNATE NAMES`);
      console.log(`  Total files with alternateName: ${filesWithAltName.length}`);

      // Display first 5 examples
      filesWithAltName.slice(0, 5).forEach((file) => {
        console.log(`\n  Example:`);
        console.log(`    @id: ${file["@id"]}`);
        console.log(`    alternateName: ${file.alternateName}`);
        if (file.sha1) {
          console.log(`    sha1: ${file.sha1}`);
        }
      });

      if (filesWithAltName.length > 5) {
        console.log(`\n  ... and ${filesWithAltName.length - 5} more files with alternateName`);
      }

      assert(filesWithAltName.length > 0, "Should find files with alternateName");
    });

    it("should display all files with alternateName", () => {
      const filesWithAltName = crate.graph.filter(
        (entity) => entity["@type"] === "File" && entity.alternateName,
      );

      console.log(`\n📋 COMPLETE LIST OF FILES WITH ALTERNATE NAMES`);

      filesWithAltName.forEach((file, idx) => {
        console.log(
          `  [${idx + 1}] ${file["@id"]} → ${file.alternateName}`,
        );
      });

      console.log(`\n  Total: ${filesWithAltName.length} files with alternateName`);
    });

    it("should compare files with and without alternateName", () => {
      const allFiles = crate.graph.filter((entity) => entity["@type"] === "File");
      const filesWithAltName = allFiles.filter((file) => file.alternateName);
      const filesWithoutAltName = allFiles.filter((file) => !file.alternateName);

      console.log(`\n📊 ALTERNATE NAME DISTRIBUTION`);
      console.log(`  Total File entities: ${allFiles.length}`);
      console.log(`  With alternateName: ${filesWithAltName.length} (${Math.round((filesWithAltName.length / allFiles.length) * 100)}%)`);
      console.log(`  Without alternateName: ${filesWithoutAltName.length} (${Math.round((filesWithoutAltName.length / allFiles.length) * 100)}%)`);
    });
  });

  describe("Using alternateName in File Metadata", () => {
    it("should access alternateName through file metadata API", () => {
      // Find a file entry in the ZIP
      const zipFile = Array.from(explorer.zipArchive.entries.values()).find(
        (entry) => entry.type === "File",
      );

      if (zipFile) {
        const metadata = explorer.getFileEntryMetadata(zipFile);

        console.log(`\n📥 FILE METADATA WITH ALTERNATE NAME`);
        console.log(`  ZIP path: ${metadata.path}`);
        console.log(`  Name: ${metadata.name}`);
        console.log(`  Size: ${metadata.size} bytes`);
        console.log(`  Alternate name: ${metadata.alternateName ?? "(not set)"}`);
      }
    });

    it("should find files by alternateName in the metadata", () => {
      const filesWithAltName = crate.graph.filter(
        (entity) => entity["@type"] === "File" && entity.alternateName,
      );

      if (filesWithAltName.length > 0) {
        const exampleFile = filesWithAltName[0];

        console.log(`\n🔍 FINDING FILE BY ALTERNATE NAME`);
        console.log(`  Looking for entity with @id: ${exampleFile["@id"]}`);

        const foundEntity = crate.getEntity(exampleFile["@id"]);

        assert(foundEntity, "Should find entity by @id");
        assert.equal(foundEntity.alternateName, exampleFile.alternateName, "alternateName should match");

        console.log(`  Found: ${foundEntity.name || foundEntity["@id"]}`);
        console.log(`  Alternate name: ${foundEntity.alternateName}`);
      }
    });
  });

  describe("RO-Crate with SHA1 Hashes", () => {
    it("should find files with both sha1 and alternateName", () => {
      const filesWithBoth = crate.graph.filter(
        (entity) =>
          entity["@type"] === "File" &&
          entity.alternateName &&
          entity.sha1,
      );

      console.log(`\n🔐 FILES WITH SHA1 AND ALTERNATE NAMES`);
      console.log(`  Total: ${filesWithBoth.length}`);

      filesWithBoth.slice(0, 3).forEach((file) => {
        console.log(`\n  File:`);
        console.log(`    @id: ${file["@id"]}`);
        console.log(`    alternateName: ${file.alternateName}`);
        console.log(`    sha1: ${file.sha1}`);
      });

      if (filesWithBoth.length > 3) {
        console.log(`\n  ... and ${filesWithBoth.length - 3} more`);
      }

      assert(filesWithBoth.length > 0, "Should find files with both sha1 and alternateName");
    });
  });

  describe("Real-World Usage Scenarios", () => {
    it("should demonstrate resolving original file path from alternateName", () => {
      const filesWithAltName = crate.graph.filter(
        (entity) => entity["@type"] === "File" && entity.alternateName,
      );

      if (filesWithAltName.length > 0) {
        console.log(`\n🛠️  RESOLVING ORIGINAL FILE PATHS`);

        filesWithAltName.slice(0, 3).forEach((file) => {
          const storedId = file["@id"] as string;
          const originalPath = file.alternateName as string;

          console.log(`\n  Mapping:`);
          console.log(`    Stored as: ${storedId}`);
          console.log(`    Original: ${originalPath}`);
          console.log(`    Use case: Can reconstruct original directory structure in outputs`);
        });
      }
    });

    it("should enable directory structure reconstruction", () => {
      const filesWithAltName = crate.graph.filter(
        (entity) => entity["@type"] === "File" && entity.alternateName,
      );

      console.log(`\n🏗️  RECONSTRUCTING DIRECTORY STRUCTURE`);

      // Group by directory in alternateName
      const directoryCounts: Record<string, number> = {};

      filesWithAltName.forEach((file) => {
        const altName = file.alternateName as string;
        const dir = altName.split("/").slice(0, -1).join("/") || "(root)";
        directoryCounts[dir] = (directoryCounts[dir] || 0) + 1;
      });

      console.log(`\n  Directories found in alternateName paths:`);
      Object.entries(directoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([dir, count]) => {
          console.log(`    ${dir}: ${count} files`);
        });

      console.log(`\n  Total directories: ${Object.keys(directoryCounts).length}`);
    });
  });
});
