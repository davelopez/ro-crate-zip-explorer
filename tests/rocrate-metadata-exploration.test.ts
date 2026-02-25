import { beforeAll, describe, it } from "vitest";
import { ROCrateZipExplorer } from "../src";
import type { ROCrateImmutableView } from "../src/types/ro-crate-interfaces";
import { testFileProvider } from "./testUtils";

/**
 * This test file explores the structure of RO-Crate metadata.
 * It demonstrates how to access and inspect:
 * - Root dataset properties
 * - Metadata file descriptor
 * - Context and vocabulary
 * - Graph entities
 *
 * RUN: vitest rocrate-metadata-exploration.test.ts --reporter=verbose
 */
describe("RO-Crate Metadata Exploration", async () => {
  let explorer: ROCrateZipExplorer;
  let crate: ROCrateImmutableView;

  beforeAll(async () => {
    const testFile = await testFileProvider.local("cwltool-runcrate.zip");
    explorer = new ROCrateZipExplorer(testFile.source);
    await explorer.open();
    await explorer.extractMetadata();
    crate = explorer.crate;
  });

  describe("Root Dataset Properties", () => {
    it("should display root dataset basic information", () => {
      const rootDataset = crate.rootDataset;

      console.log("\n📦 ROOT DATASET");
      console.log(`  @id: ${rootDataset["@id"]}`);
      console.log(`  @type: ${rootDataset["@type"]}`);
      console.log(`  name: ${rootDataset.name}`);
      console.log(`  description: ${rootDataset.description}`);
      console.log(`  datePublished: ${rootDataset.datePublished}`);
      console.log(`  license: ${JSON.stringify(rootDataset.license)}`);
      if (rootDataset.identifier) {
        console.log(`  identifier: ${JSON.stringify(rootDataset.identifier)}`);
      }
    });

    it("should access root dataset via rootId", () => {
      const rootId = crate.rootId;
      console.log(`\n🔍 Root ID: ${rootId}`);

      const rootEntity = crate.getEntity(rootId);
      console.log(`\n Root entity retrieved: ${rootEntity?.["@type"]} at ${rootEntity?.["@id"]}`);
    });

    it("should display all root dataset properties", () => {
      const rootDataset = crate.rootDataset;

      console.log("\n🏷️  ALL ROOT DATASET PROPERTIES:");
      Object.entries(rootDataset).forEach(([key, value]) => {
        const displayValue =
          typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : value;
        console.log(`  ${key}: ${displayValue}`);
      });
    });
  });

  describe("Metadata File Descriptor", () => {
    it("should display metadata file descriptor information", () => {
      const metadataFile = crate.metadataFileEntity;

      console.log("\n📄 METADATA FILE DESCRIPTOR");
      console.log(`  @id: ${metadataFile["@id"]}`);
      console.log(`  @type: ${metadataFile["@type"]}`);
      console.log(`  about: ${JSON.stringify(metadataFile.about)}`);
      console.log(`  conformsTo: ${JSON.stringify(metadataFile.conformsTo)}`);
    });

    it("should resolve metadata file descriptor with linked objects", () => {
      const metadataFile = crate.metadataFileEntity;

      console.log("\n🔗 METADATA FILE - LINKED OBJECTS");

      if (typeof metadataFile.about === "object" && "@id" in metadataFile.about) {
        const aboutId = metadataFile.about["@id"];
        const aboutEntity = crate.getEntity(aboutId);
        console.log(`  about entity (@id: ${aboutId}):`, aboutEntity?.["@type"]);
      }

      const conformsTo = Array.isArray(metadataFile.conformsTo)
        ? metadataFile.conformsTo
        : [metadataFile.conformsTo];

      conformsTo.forEach((cf) => {
        if (typeof cf === "object" && "@id" in cf) {
          console.log(`  conformsTo @id: ${cf["@id"]}`);
        }
      });
    });

    it("should display all metadata file properties", () => {
      const metadataFile = crate.metadataFileEntity;

      console.log("\n🏷️  ALL METADATA FILE PROPERTIES:");
      Object.entries(metadataFile).forEach(([key, value]) => {
        const displayValue =
          typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : value;
        console.log(`  ${key}: ${displayValue}`);
      });
    });
  });

  describe("Context and Vocabulary", () => {
    it("should display the RO-Crate context", () => {
      const context = crate.context;

      console.log("\n📚 RO-CRATE CONTEXT");
      if (typeof context === "string") {
        console.log(`  Context URL: ${context}`);
      } else if (Array.isArray(context)) {
        context.forEach((ctx, idx) => {
          if (typeof ctx === "string") {
            console.log(`  [${idx}] URL: ${ctx}`);
          } else if (typeof ctx === "object") {
            console.log(`  [${idx}] Custom context: ${Object.keys(ctx).join(", ")}`);
          }
        });
      }
    });

    it("should resolve context terms", async () => {
      console.log("\n🔤 RESOLVING CONTEXT TERMS");

      const contextLookup = await crate.resolveContext();

      // Get some example terms
      const exampleTerms = ["name", "description", "author", "datePublished"];
      exampleTerms.forEach((term) => {
        const definition = contextLookup.getDefinition(term);
        console.log(`  "${term}": ${definition?.["@id"] || "not found"}`);
      });
    });
  });

  describe("Graph Entities", () => {
    it("should display total number of entities in the graph", () => {
      const graphSize = crate.graphSize;
      console.log(`\n📊 GRAPH SIZE: ${graphSize} entities`);
    });

    it("should iterate through all graph entities", () => {
      const graph = crate.graph;

      console.log(`\n📋 ALL ENTITIES IN GRAPH:`);
      graph.forEach((entity, idx) => {
        const id = entity["@id"] || "unknown";
        const type = entity["@type"] || "no type";
        const name = entity.name || entity.title || "";
        console.log(
          `  [${idx}] @id: ${id} | @type: ${type}${name ? ` | name: ${name}` : ""}`,
        );
      });
    });

    it("should find specific entity types", () => {
      const graph = crate.graph;

      // Count entity types
      const typeCount: Record<string | unknown, number> = {};
      graph.forEach((entity) => {
        const type = Array.isArray(entity["@type"])
          ? entity["@type"][0]
          : entity["@type"] || "Unknown";
        typeCount[type as string] = (typeCount[type as string] || 0) + 1;
      });

      console.log("\n📈 ENTITY TYPE DISTRIBUTION:");
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    });

    it("should demonstrate entity lookup by ID", () => {
      const rootDataset = crate.rootDataset;
      const rootId = rootDataset["@id"];

      console.log(`\n🔎 ENTITY LOOKUP BY ID`);
      console.log(`  Looking up: ${rootId}`);

      const entity = crate.getEntity(rootId);
      if (entity) {
        console.log(`  Found entity with @type: ${entity["@type"]}`);
        console.log(`  Entity name: ${entity.name || "no name"}`);
      } else {
        console.log(`  Entity not found`);
      }
    });

    it("should check entity existence", () => {
      const rootId = crate.rootId;

      console.log(`\n✅ ENTITY EXISTENCE CHECK`);
      console.log(`  Root ID exists: ${crate.hasEntity(rootId)}`);
      console.log(`  Non-existent ID: ${crate.hasEntity("non-existent-id")}`);
    });
  });

  describe("File Entries and Metadata", () => {
    it("should list all files in the archive and their metadata", () => {
      const entries = explorer.entries;
      const files = Array.from(entries.values()).filter((e) => e.type === "File");

      console.log(`\n📁 FILES IN ARCHIVE (Total: ${files.length})`);
      files.slice(0, 10).forEach((file) => {
        const metadata = explorer.getFileEntryMetadata(file);
        console.log(
          `  ${metadata.path} (${metadata.size} bytes, modified: ${metadata.dateTime})`,
        );
      });

      if (files.length > 10) {
        console.log(`  ... and ${files.length - 10} more files`);
      }
    });

    it("should find and extract RO-Crate metadata JSON", async () => {
      const metadataFileEntry = explorer.zipArchive.findFileByName("ro-crate-metadata.json");

      if (metadataFileEntry) {
        const fileContents = await explorer.getFileContents(metadataFileEntry);
        const jsonText = new TextDecoder().decode(fileContents);
        const metadata = JSON.parse(jsonText);

        console.log("\n📜 RO-CRATE METADATA.JSON STRUCTURE:");
        console.log(`  @context: ${typeof metadata["@context"]}`);
        console.log(`  @graph length: ${metadata["@graph"]?.length || 0}`);
        console.log(
          `  Root dataset (@id="${metadata["@graph"]?.[0]?.["@id"]}"): ${metadata["@graph"]?.[0]?.name || "unknown"}`,
        );
      }
    });
  });

  describe("JSON Representation", () => {
    it("should convert RO-Crate to JSON", () => {
      const jsonRepresentation = crate.toJSON();

      console.log(`\n💾 JSON REPRESENTATION`);
      console.log(`  Has @context: ${"@context" in jsonRepresentation}`);
      console.log(`  Has @graph: ${"@graph" in jsonRepresentation}`);
      console.log(`  @graph is array: ${Array.isArray(jsonRepresentation["@graph"])}`);

      const graphArray = jsonRepresentation["@graph"] as Array<Record<string, unknown>>;
      if (Array.isArray(graphArray)) {
        console.log(`  Number of entities in JSON graph: ${graphArray.length}`);
      }
    });
  });
});
