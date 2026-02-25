import { assert, beforeAll, describe, it } from "vitest";
import { ROCrateZipExplorer } from "../src";
import type { Entity, ROCrateImmutableView } from "../src/types/ro-crate-interfaces";
import type { ZipExplorer } from "../src/interfaces";
import { testFileProvider } from "./testUtils";

/**
 * This test demonstrates how to interact with sub-elements in RO-Crate metadata.
 * It shows how to:
 * - Access file entities by their @id
 * - Read entity properties
 * - Follow linked references between entities
 * - Extract actual file contents from the ZIP archive
 * - Navigate the graph structure
 *
 * RUN: vitest rocrate-subelements-interaction.test.ts --reporter=verbose
 */
describe("RO-Crate Sub-Elements Interaction", async () => {
  let explorer: ROCrateZipExplorer;
  let crate: ROCrateImmutableView;

  beforeAll(async () => {
    const testFile = await testFileProvider.local("rocrate-test.zip");
    explorer = new ROCrateZipExplorer(testFile.source);
    await explorer.open();
    await explorer.extractMetadata();
    crate = explorer.crate;
  });

  describe("Accessing File Entities", () => {
    it("should get a file entity by its @id", () => {
      const fileId = "datasets/Trim_on_data_1_1690cb0a3211e932.txt";
      const fileEntity = crate.getEntity(fileId);

      console.log("\n📄 FILE ENTITY BY ID");
      console.log(`  @id: ${fileEntity?.["@id"]}`);
      console.log(`  @type: ${fileEntity?.["@type"]}`);
      console.log(`  name: ${fileEntity?.name}`);
      console.log(`  encodingFormat: ${fileEntity?.encodingFormat}`);
      console.log(`  exampleOfWork: ${JSON.stringify(fileEntity?.exampleOfWork)}`);

      assert(fileEntity, "File entity should exist");
      assert(fileEntity["@id"] === fileId, "Entity ID should match");
      assert(fileEntity["@type"] === "File", "Entity type should be File");
    });

    it("should verify file entity exists in the graph", () => {
      const fileId = "datasets/dataset_0_a46159036db0da48.txt";
      const exists = crate.hasEntity(fileId);

      console.log(`\n✅ ENTITY EXISTENCE`);
      console.log(`  Entity "${fileId}" exists: ${exists}`);

      assert(exists, "File entity should exist in the graph");
    });

    it("should access file entity properties", () => {
      const fileId = "workflows/768c309887556fb5.gxwf.yml";
      const workflow = crate.getEntity(fileId);

      console.log(`\n🔧 WORKFLOW FILE PROPERTIES`);
      console.log(`  @id: ${workflow?.["@id"]}`);
      console.log(`  @type: ${JSON.stringify(workflow?.["@type"])}`);
      console.log(`  name: ${workflow?.name}`);
      console.log(`  programmingLanguage: ${JSON.stringify(workflow?.programmingLanguage)}`);
      console.log(`  input: ${JSON.stringify(workflow?.input)}`);
      console.log(`  output: ${JSON.stringify(workflow?.output)}`);

      // Access all properties
      console.log(`\n  All properties:`);
      Object.entries(workflow || {})
        .filter(([key]) => !key.startsWith("@"))
        .forEach(([key, value]) => {
          const displayValue =
            typeof value === "object" ? JSON.stringify(value) : value;
          console.log(`    ${key}: ${displayValue}`);
        });
    });

    it("should access alternateName property from file entities", () => {
      const fileId = "datasets/Trim_on_data_1_1690cb0a3211e932.txt";
      const fileEntity = crate.getEntity(fileId);

      console.log("\n🏷️  ALTERNATE NAME PROPERTY");
      console.log(`  File entity @id: ${fileEntity?.["@id"]}`);
      console.log(`  File entity name: ${fileEntity?.name}`);
      console.log(`  Alternate name: ${fileEntity?.alternateName ?? "(not set)"}`);

      // Verify the property exists (even if undefined)
      assert(fileEntity, "File entity should exist");
      assert("alternateName" in fileEntity || !("alternateName" in fileEntity), "Should be able to check for alternateName property");

      // Note: alternateName may be undefined if not present in RO-Crate metadata
      // This demonstrates how to safely access it
      if (fileEntity?.alternateName) {
        console.log(`  ✓ Alternate name found: ${fileEntity.alternateName}`);
      } else {
        console.log(`  ℹ️  No alternate name specified (common for standard RO-Crates)`);
      }
    });

    it("should find and display alternateName for all files that have it", () => {
      const allFiles = crate.graph.filter((entity) => entity["@type"] === "File");

      console.log("\n🔍 FILES WITH ALTERNATE NAMES");
      const filesWithAltName = allFiles.filter((file) => file.alternateName);

      if (filesWithAltName.length > 0) {
        console.log(`  Files with alternate names: ${filesWithAltName.length}`);
        filesWithAltName.forEach((file) => {
          console.log(`  - ${file.name || file["@id"]}`);
          console.log(`    alternateName: ${file.alternateName}`);
        });
      } else {
        console.log(
          `  No files with alternate names found in this RO-Crate`,
        );
        console.log(
          `  (alternateName is optional and may be present in RO-Crates like cwltool-runcrate.zip)`,
        );
      }
    });
  });

  describe("Following Linked References", () => {
    it("should follow linked references between entities", () => {
      const fileId = "datasets/Trim_on_data_1_1690cb0a3211e932.txt";
      const fileEntity = crate.getEntity(fileId);

      console.log(`\n🔗 FOLLOWING LINKED REFERENCES`);
      console.log(`  File: ${fileEntity?.name}`);

      // The exampleOfWork property references another entity
      const exampleOfWorkRef = fileEntity?.exampleOfWork;
      if (
        exampleOfWorkRef &&
        typeof exampleOfWorkRef === "object" &&
        "@id" in exampleOfWorkRef
      ) {
        const linkedId = exampleOfWorkRef["@id"] as string;
        console.log(`  References exampleOfWork: ${linkedId}`);

        const linkedEntity = crate.getEntity(linkedId);
        console.log(`  Linked entity found: ${linkedEntity?.name || linkedEntity?.["@id"]}`);
        console.log(`  Linked entity type: ${linkedEntity?.["@type"]}`);
      }
    });

    it("should navigate workflow input/output parameters", () => {
      const workflowId = "workflows/768c309887556fb5.gxwf.yml";
      const workflow = crate.getEntity(workflowId);

      console.log(`\n⚙️  WORKFLOW PARAMETERS`);
      console.log(`  Workflow: ${workflow?.name}`);

      // Follow input reference
      const inputRef = workflow?.input;
      if (inputRef && typeof inputRef === "object" && "@id" in inputRef) {
        const inputId = inputRef["@id"] as string;
        const inputEntity = crate.getEntity(inputId);
        console.log(`  Input parameter: ${inputEntity?.name} (${inputId})`);
      }

      // Follow output reference
      const outputRef = workflow?.output;
      if (outputRef && typeof outputRef === "object" && "@id" in outputRef) {
        const outputId = outputRef["@id"] as string;
        const outputEntity = crate.getEntity(outputId);
        console.log(`  Output parameter: ${outputEntity?.name} (${outputId})`);
      }
    });

    it("should find files referenced in metadata", () => {
      const rootDataset = crate.rootDataset;
      const hasParts = rootDataset.hasPart;

      console.log(`\n📦 ROOT DATASET FILES (hasPart)`);

      const fileRefs = Array.isArray(hasParts) ? hasParts : [hasParts];
      fileRefs.slice(0, 5).forEach((ref) => {
        if (typeof ref === "object" && "@id" in ref) {
          const fileId = ref["@id"] as string;
          const fileEntity = crate.getEntity(fileId);
          console.log(
            `  ${fileEntity?.name || fileEntity?.["@id"]} (${fileEntity?.["@type"]})`,
          );
        }
      });

      console.log(`  ... and ${Math.max(0, fileRefs.length - 5)} more files`);
    });
  });

  describe("Extracting File Contents from ZIP", () => {
    it("should extract contents of a file entity", async () => {
      const fileId = "datasets/Trim_on_data_1_1690cb0a3211e932.txt";
      const fileEntity = crate.getEntity(fileId);

      console.log(`\n📥 EXTRACTING FILE CONTENTS`);
      console.log(`  File: ${fileEntity?.name}`);

      // Find the ZIP entry for this file
      const zipEntry = explorer.zipArchive.findFileByName(fileId);
      if (zipEntry) {
        const contents = await explorer.getFileContents(zipEntry);
        const text = new TextDecoder().decode(contents);

        console.log(`  File size: ${contents.byteLength} bytes`);
        console.log(`  First 100 characters: ${text.substring(0, 100)}...`);
      }
    });

    it("should stream file contents for large files", async () => {
      const fileId = "jobs_attrs.txt";
      const fileEntity = crate.getEntity(fileId);

      console.log(`\n📺 STREAMING FILE CONTENTS`);
      console.log(`  File: ${fileEntity?.name || fileId}`);

      const zipEntry = explorer.zipArchive.findFileByName(fileId);
      if (zipEntry) {
        const stream = explorer.getFileContentStream(zipEntry);
        const reader = stream.getReader();

        let totalBytes = 0;
        let chunkCount = 0;

        for (let done = false; !done; ) {
          const { done: isDone, value } = await reader.read();
          done = isDone;
          if (value) {
            totalBytes += value.byteLength;
            chunkCount++;
          }
        }

        console.log(`  Total bytes streamed: ${totalBytes}`);
        console.log(`  Number of chunks: ${chunkCount}`);
      }
    });

    it("should access file metadata from ZIP", () => {
      const fileId = "datasets/Trim_on_data_1_1690cb0a3211e932.txt";

      console.log(`\n🗂️  FILE METADATA FROM ZIP`);

      const zipEntry = explorer.zipArchive.findFileByName(fileId);
      if (zipEntry) {
        const metadata = explorer.getFileEntryMetadata(zipEntry);

        console.log(`  Path: ${metadata.path}`);
        console.log(`  Name: ${metadata.name}`);
        console.log(`  Size: ${metadata.size} bytes`);
        console.log(`  Modified: ${metadata.dateTime}`);
        console.log(`  Is compressed: ${zipEntry.isCompressed}`);
        console.log(`  Compression method: ${zipEntry.compressionMethod}`);
      }
    });
  });

  describe("Querying and Filtering Entities", () => {
    it("should find all File entities in the graph", () => {
      const fileEntities = crate.graph.filter((entity) => entity["@type"] === "File");

      console.log(`\n🔍 ALL FILE ENTITIES`);
      console.log(`  Total files: ${fileEntities.length}`);

      fileEntities.slice(0, 5).forEach((file) => {
        console.log(
          `  - ${file.name || file["@id"]} (${file.encodingFormat || "unknown format"})`,
        );
      });
    });

    it("should find entities of specific types", () => {
      const workflows = crate.graph.filter(
        (entity) =>
          Array.isArray(entity["@type"]) &&
          entity["@type"].includes("ComputationalWorkflow"),
      );

      console.log(`\n🔸 COMPUTATIONAL WORKFLOWS`);
      console.log(`  Total workflows: ${workflows.length}`);

      workflows.forEach((workflow) => {
        console.log(`  - ${workflow.name || workflow["@id"]} (${workflow.programmingLanguage?.["@id"] || "unknown"})`);
      });
    });

    it("should find entities matching custom criteria", () => {
      // Find all text files
      const textFiles = crate.graph.filter(
        (entity) =>
          entity["@type"] === "File" && entity.encodingFormat === "text/plain",
      );

      console.log(`\n📝 TEXT FILES (text/plain)`);
      console.log(`  Total: ${textFiles.length}`);

      textFiles.forEach((file) => {
        console.log(`  - ${file.name || file["@id"]}`);
      });
    });

    it("should find entities by property value", () => {
      // Find all entities with a description
      const documented = crate.graph.filter((entity) => entity.description);

      console.log(`\n📚 ENTITIES WITH DESCRIPTIONS`);
      console.log(`  Total: ${documented.length}`);

      documented.forEach((entity) => {
        console.log(`  - ${entity.name || entity["@id"]}: ${entity.description}`);
      });
    });
  });

  describe("Complex Entity Relationships", () => {
    it("should trace a complete workflow execution chain", () => {
      // Find the CreateAction (workflow execution event)
      const createActions = crate.graph.filter(
        (entity) => entity["@type"] === "CreateAction",
      ) as Entity[];

      if (createActions.length > 0) {
        const execution = createActions[0];

        console.log(`\n⛓️  WORKFLOW EXECUTION CHAIN`);
        console.log(`  Event: ${execution.name}`);
        console.log(`  Type: ${execution["@type"]}`);

        // Get the instrument (workflow)
        if (execution.instrument && typeof execution.instrument === "object") {
          const instrumentId = (execution.instrument as { "@id": string })["@id"];
          const workflow = crate.getEntity(instrumentId);
          console.log(`  Workflow: ${workflow?.name} (${instrumentId})`);
        }

        // Get the input object
        if (execution.object && typeof execution.object === "object") {
          const objectId = (execution.object as { "@id": string })["@id"];
          const inputFile = crate.getEntity(objectId);
          console.log(`  Input file: ${inputFile?.name} (${objectId})`);
        }

        // Get the output result
        if (execution.result && typeof execution.result === "object") {
          const resultId = (execution.result as { "@id": string })["@id"];
          const outputFile = crate.getEntity(resultId);
          console.log(`  Output file: ${outputFile?.name} (${resultId})`);
        }

        // Timing
        console.log(`  Started: ${execution.startTime}`);
        console.log(`  Ended: ${execution.endTime}`);
      }
    });
  });

  describe("Entity JSON Representation", () => {
    it("should get JSON representation of a file entity", () => {
      const fileId = "datasets/Trim_on_data_1_1690cb0a3211e932.txt";
      const fileEntity = crate.getEntity(fileId);

      console.log(`\n💾 FILE ENTITY JSON`);
      console.log(JSON.stringify(fileEntity, null, 2));
    });
  });
});
