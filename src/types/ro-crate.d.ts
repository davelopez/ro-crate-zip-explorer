declare module "ro-crate" {
  type IROCrate = import("./ro-crate-interfaces").ROCrateReadOnlyView;
  type RawEntity = import("./ro-crate-interfaces").RawEntity;
  type Entity = import("./ro-crate-interfaces").Entity;

  /**
   * Class for building, navigating, testing and rendering ROCrates
   */
  export class ROCrate implements IROCrate {
    constructor(json: Record<string, unknown>, config?: ROCrateConfig);

    // TODO: This is a read-only view of the ROCrate object limited to the scope of the current project.
    // These type definitions should be completed and moved to a new package @types/ro-crate and
    // contributed to DefinitelyTyped (https://github.com/DefinitelyTyped/DefinitelyTyped)

    context: unknown[];
    graph: Entity[];
    graphSize: number;
    metadataFileEntity: Entity;
    rootDataset: Entity;
    rootId: string;

    resolveContext(): Promise<void>;
    getDefinition(term: string): RawEntity | undefined;
    getTerm(definition: string | Record<string, unknown>): string | undefined;
    getEntity(id: string): Entity | undefined;
    hasEntity(id: string): boolean;
    getIdentifier(name: string): string | undefined;
    toJSON(): Record<string, unknown>;
  }

  export function validate(crate: ROCrate, files: unknown): Promise<ValidationResults>;
}
