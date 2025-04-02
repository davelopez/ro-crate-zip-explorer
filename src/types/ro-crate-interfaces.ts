/**
 * This interface represents an immutable read-only view of an RO-Crate.
 *
 * It provides access to the context, graph, and metadata of the RO-Crate.
 * It also provides methods for resolving context terms, getting entity definitions,
 * getting entities from the graph, and checking if an entity exists in the graph.
 */
export interface ROCrateImmutableView extends ContextLookup {
  /**
   * The context part of the crate.
   * This returns the original context information.
   */
  readonly "@context": string | string[];

  /** An alias for '@context'. */
  readonly context: string | string[];

  /** An array of all nodes in the graph. */
  readonly "@graph": Entity[];

  /** An alias for '@graph' */
  readonly graph: Entity[];

  /** The number of nodes in the graph. */
  readonly graphSize: number;

  /**
   * The metadata file entity.
   * This is the entity that represents the metadata file of the RO Crate.
   */
  readonly metadataFileEntity: MetadataFileDescriptor;

  /**
   * The root dataset entity. An alias for the entity with the same id as the rootId.
   */
  readonly rootDataset: RootDataset;

  /**
   * The root identifier of the RO Crate
   */
  readonly rootId: string;

  /**
   * Generate a local flat lookup table for context terms
   */
  resolveContext(): Promise<ContextLookup>;

  /**
   * Get an entity from the graph.
   * If config.link is true, any reference (object with just "@id" property)
   * is resolved as a nested object.
   * @param id An entity identifier
   * @return A wrapper for entity that resolves properties as linked objects
   */
  getEntity(id: string): Entity | undefined;

  /**
   * Check if entity exists in the graph
   * @param id An entity identifier
   */
  hasEntity(id: string): boolean;

  /**
   * Get named identifier
   */
  getIdentifier(name: string): string | undefined;

  /**
   * Convert the rocrate into plain JSON object.
   * The value returned by this method is used when JSON.stringify() is used on the ROCrate object.
   * @return plain JSON object
   */
  toJSON(): Record<string, unknown>;
}

/**
 * This interface represents a context lookup table for resolving context terms.
 */
interface ContextLookup {
  /**
   * Get the context term definition. This method will also search for term defined locally in the graph.
   * Make sure `resolveContext()` has been called prior calling this method.
   */
  getDefinition(term: string): RawEntity | undefined;

  /**
   * Get the context term name from it's definition id.
   * Make sure `resolveContext()` has been called prior calling this method.
   * @param {string|object} definition
   */
  getTerm(definition: string | RawEntity): string | undefined;
}

export interface ROCrateConfig {
  /** Always return property of an Entity as an array (eg when using getEntity() method) */
  array?: boolean;

  /** Resolve linked node as nested object */
  link?: boolean;

  /** When importing from json, a subsequent duplicate entity always replaces the existing one */
  replace?: boolean;

  /** When replacing or updating an entity, merge the values and the properties instead of full replace */
  merge?: boolean;

  /** Allow duplicate values in a property that has multiple values */
  duplicate?: boolean;

  /** The default value for `@type` to be used when adding a new entity and the property is not specified. Default to 'Thing' */
  defaultType?: string;
}

interface ValidationEntry {
  id: string;
  status: "success" | "warning" | "error";
  message: string;
  clause: string;
}

export type ValidationResults = ValidationEntry[];

export interface RawEntity {
  readonly "@id": string;
  readonly [key: string]: unknown;
}

interface NodeRef {
  readonly "@id": string;
}

/**
 * This interface represents an entity in the RO-Crate metadata model.
 */
export interface Entity extends RawEntity, NodeRef {
  // TODO: Add more properties as needed
}

/**
 * The Root Data Entity in RO-Crate (Research Object Crate) is the main entry point
 * for describing a research object in the RO-Crate metadata model. It represents
 * the dataset or research object as a whole and serves as the primary entity connecting
 * all other metadata descriptions.
 */
interface RootDataset extends Entity {
  readonly "@type": "Dataset";

  /**
   * The identifier of the dataset. This MUST be the relative path "./" (indicating the
   * directory of ro-crate-metadata.json is the RO-Crate Root), or an absolute URI.
   */
  readonly "@id": string;

  /**
   * The name of the dataset. This SHOULD identify the dataset to humans well enough to
   * disambiguate it from other RO-Crates.
   */
  readonly name: string;

  /**
   * Further elaboration on the name to provide a summary of the context in which the
   * dataset is important.
   */
  readonly description: string;

  /**
   * The date the dataset was published. This MUST be a string in ISO 8601 date format
   * and SHOULD be specified to at least the precision of a day, MAY be a timestamp down
   * to the millisecond.
   */
  readonly datePublished: string;

  /**
   * The license of the dataset. This SHOULD link to a Contextual Entity in the RO-Crate
   * Metadata File with a name and description. MAY have a URI (eg for Creative Commons or
   * Open Source licenses). MAY, if necessary be a textual description of how the RO-Crate
   * may be used.
   */
  readonly license: string | Entity;

  /**
   * RO-Crates that have been assigned a persistent identifier (e.g. a DOI) MAY indicate
   * this using identifier. This could be an URI or a reference to a Contextual Entity in
   * the RO-Crate Metadata File.
   */
  readonly identifier?: string | Entity;
}

/**
 * The Metadata File Descriptor in RO-Crate is a special entity that provides metadata
 * about the RO-Crate Metadata File itself (ro-crate-metadata.json). It ensures that the
 * metadata file is properly identified and described within the RO-Crate structure.
 */
interface MetadataFileDescriptor extends Entity {
  /**
   * The type of the entity. This MUST be "CreativeWork" for a Metadata File Descriptor.
   */
  readonly "@type": "CreativeWork";

  /**
   * A reference to the Root Data Entity in the RO-Crate.
   */
  readonly about: Entity;
  readonly conformsTo: Entity | Entity[];
}
