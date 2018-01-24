const webpack = require("webpack");
const path = require('path');

module.exports = {
    entry: {
        youtubeExtension: path.join(__dirname, 'src/youtubeExtension.ts'),
        background: path.join(__dirname, 'src/background.ts'),
        youlikeExtension: path.join(__dirname, 'src/youlikeExtension.ts'),
        vendor: ['jquery']
    },
    output: {
        path: path.join(__dirname, 'dist/js'),
        filename: '[name].js'
    },
    module: {
        loaders: [{
            exclude: /node_modules/,
            test: /\.tsx?$/,
            loader: 'ts-loader'
        },
        {
            test: /\.css$/,
            loader: 'style-loader!css-loader'
        }]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [

        // pack common vender files
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor', 
            minChunks: Infinity
        }),

        // minify
        // new webpack.optimize.UglifyJsPlugin()
    ]
};
