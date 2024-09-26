# ro-crate-zip-vue

This is an example Vue 3 project that demonstrates how to use the [ro-crate-zip-explorer](../../../README.md) library.

## Project Setup

The project needs to link to the local ro-crate-zip-explorer library. To do this:

Ensure you are in the root directory of the ro-crate-zip-explorer project:

Install all dependencies if you haven't already:

```sh
yarn
```

Build the library:

```sh
yarn build
```

Link the library:

```sh
yarn link
```

Now, navigate to the root directory of this project (examples/vue/ro-crate-zip-vue) and link the library:

```sh
yarn link ro-crate-zip-explorer
```

### Compile and Hot-Reload for Development and Testing

```sh
yarn dev
```
