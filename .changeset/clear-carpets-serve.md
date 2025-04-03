---
"ro-crate-zip-explorer": minor
---

Add abstractions for metadata extraction

The most important changes include the introduction of new abstract classes and interfaces for metadata extraction.

This simplifies the creation of new types of "Explorers" that can load particular files containing metadata about the rest of the files. RO-crate zips do this, but now it can be reused in other types of zips that may contain known structured contents with metadata.

The new abstract classes and interfaces provide a clear structure for implementing metadata extraction, making it easier to extend the functionality in the future. The changes also improve the overall organization of the code, making it more maintainable and easier to understand.
