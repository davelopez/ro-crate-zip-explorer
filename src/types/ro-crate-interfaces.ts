/**
 * This interface represents an immutable read-only view of an RO-Crate.
 *
 * It provides access to the context, graph, and metadata of the RO-Crate.
 * It also provides methods for resolving context terms, getting entity definitions,
 * getting entities from the graph, and checking if an entity exists in the graph.
 */
export interface ROCrateReadOnlyView {
  /**
   * The context part of the crate. An alias for '@context'.
   * This returns the original context information.
   */
  readonly context: unknown[];

  /**
   * An array of all nodes in the graph. An alias for '@graph'
   */
  readonly graph: Entity[];

  /**
   * The number of nodes in the graph
   */
  readonly graphSize: number;

  /**
   * The metadata file entity.
   * This is the entity that represents the metadata file of the RO Crate.
   */
  readonly metadataFileEntity: Entity;

  /**
   * The root dataset entity. An alias for the entity with the same id as the rootId.
   */
  readonly rootDataset: Entity;

  /**
   * The root identifier of the RO Crate
   */
  readonly rootId: string;

  /**
   * Generate a local flat lookup table for context terms
   */
  resolveContext(): Promise<void>;

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
  getTerm(definition: string | Record<string, unknown>): string | undefined;

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
  readonly "@reverse": Record<string, unknown>;
}

export interface Entity extends RawEntity, NodeRef {
  toJSON(): RawEntity;
}
