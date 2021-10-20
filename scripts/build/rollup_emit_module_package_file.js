
/**
 * 
 * @returns a rollup plugin that creates a package.json file in the output folder
 * The package.json contains only {"type":"module"} to make Nodejs parse files in the output folder as
 * ES modules without using the .mjs extension.
 * 
 * This is useful for packages that support both Nodejs and Browser, so that they don't have to build 2
 * esm files with the same content but with different extensions.
 */
export function emitModulePackageFile() {
	return {
		generateBundle() {
			this.emitFile({ fileName: 'package.json', source: `{"type":"module"}`, type: 'asset' });
		},
		name: 'emit-module-package-file'
	};
}
