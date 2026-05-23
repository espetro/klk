// @ts-check

/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  api.cache.forever();
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: ["react-native-reanimated/plugin", ["babel-plugin-react-compiler", { target: "19" }]],
  };
};
