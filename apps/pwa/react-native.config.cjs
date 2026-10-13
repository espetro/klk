// One v2: autolinks One's own pod/Android module, Fabric components and the
// bundled Nitro packages (op-sqlite, nitro-image, nitro-web-image), overrides
// the RN CLI bundle commands for the Vite/Rolldown pipeline, and nulls the
// native code of packages One absorbs.
module.exports = require("one/react-native-config");
