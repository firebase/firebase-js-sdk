The modules in this directory provide implementations for platform-specific features that are replaced at build time
with implementations for the target platforms. SDK code should only refer to the generic implementations that are
provided directly in this directory. The generic implementations provide support for running under `ts-node` but are
otherwise unsupported.
