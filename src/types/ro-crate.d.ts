declare module "ro-crate" {
  type ROCrateImmutableView = import("./ro-crate-interfaces").ROCrateImmutableView;
  type RawEntity = import("./ro-crate-interfaces").RawEntity;
  type Entity = import("./ro-crate-interfaces").Entity;

  /**
   * Class for building, navigating, testing and rendering ROCrates
   */
  export class ROCrate implements IROCrate {
    constructor(json: Record<string, unknown>, config?: ROCrateConfig);

    "@context": string | string[];
    context: string | string[];
    "@graph": Entity[];
    graph: Entity[];
    graphSize: number;
    metadataFileEntity: MetadataFileDescriptor;
    rootDataset: RootDataset;
    rootId: string;

    resolveContext(): Promise<ContextLookup>;
    getEntity(id: string): Entity | undefined;
    hasEntity(id: string): boolean;
    getIdentifier(name: string): string | undefined;
    toJSON(): Record<string, unknown>;
  }

  export function validate(crate: ROCrate, files: unknown): Promise<ValidationResults>;

  /**
   * Interface for a ROCrate object exposing all its methods.
   */
  interface IROCrate extends ROCrateImmutableView {
    // Note: The scope of the current project does not require the full type definitions of the
    // IROCrate interface.

    // TODO: These type definitions should be completed and moved to a new package @types/ro-crate and
    // contributed to DefinitelyTyped (https://github.com/DefinitelyTyped/DefinitelyTyped) by
    // the RO-Crate community.

    set rootId(newId: string);
  }
}
