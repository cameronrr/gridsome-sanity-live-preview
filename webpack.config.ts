import path from "path";

const baseConfig = {
  target: "web",
  mode: "production",
  entry: "./src/index.ts",
  devtool: "source-map",
  externals: [],
  resolve: {
    extensions: [".mjs", ".cjs", ".js", ".jsx", ".json", ".ts", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /\.(?:js|jsx|ts|tsx)$/u,
        exclude: /node_modules/u,
        loader: "babel-loader",
      },
    ],
  },
};
const cjsConfig = {
  ...baseConfig,
  name: "cjs",
  output: {
    path: path.resolve(__dirname, "dist/cjs"),
    filename: "index.js",
    library: "GridsomeSanityLivePreview",
    libraryTarget: "commonjs2",
  },
};

const umdConfig = {
  ...baseConfig,
  name: "umd",
  output: {
    path: path.resolve(__dirname, "dist/umd"),
    filename: "index.js",
    library: "GridsomeSanityLivePreview",
    libraryTarget: "umd",
  },
};

export default [cjsConfig, umdConfig];
