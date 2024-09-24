declare module "ro-crate" {
  export { ROCrate, validate };

  /**
   * Class for building, navigating, testing and rendering ROCrates
   */
  declare class ROCrate {
    constructor(json: unknown, config?: ROCrateConfig);

    /**
     * The context part of the crate. An alias for '@context'.
     * This returns the original context information.
     */
    context: unknown[];

    /**
     * An array of all nodes in the graph. An alias for '@graph'
     */
    graph: unknown[];

    graphSize: number;
    metadataFileEntity: Entity;
    rootDataset: Entity;

    /**
     * The root identifier of the RO Crate
     */
    rootId: string;

    /**
     * Generate a local flat lookup table for context terms
     */
    async resolveContext();

    /**
     * Get the context term definition. This method will also search for term defined locally in the graph.
     * Make sure `resolveContext()` has been called prior calling this method.
     */
    getDefinition(term: string): RawEntity | undefined;

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
    hasEntity(id): boolean;

    /**
     * Get named identifier
     */
    getIdentifier(name: string): string | undefined;

    /**
     * Convert the rocrate into plain JSON object.
     * The value returned by this method is used when JSON.stringify() is used on the ROCrate object.
     * @return plain JSON object
     */
    toJSON();
  }

  declare function validate(crate: ROCrate, files: unknown): Promise<ValidationResults>;

  interface ROCrateConfig {
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

  type ValidationResults = ValidationEntry[];

  interface Entity {
    "@id": string;
    "@reverse": Record<string, unknown>;
    toJSON(): RawEntity;
    [key: string]: unknown;
  }

  interface RawEntity {
    "@id": string;
    [key: string]: unknown;
  }

  interface NodeRef {
    "@id": string;
    "@reverse": Record<string, unknown>;
  }
}
