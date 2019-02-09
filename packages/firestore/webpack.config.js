var nodeExternals = require('webpack-node-externals');

module.exports = {
    entry: "./index.ts",
    output: {
        filename: "bundle.js",
        libraryTarget: "commonjs2"        
    },
    target: 'node',
    externals: [nodeExternals()],
    devtool: 'source-maps',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            }
        ]
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js"]
    },
    optimization: {
       usedExports: true
    }
};