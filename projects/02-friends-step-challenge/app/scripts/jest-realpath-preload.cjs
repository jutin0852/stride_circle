'use strict';

const fs = require('node:fs');
const gracefulFs = require('graceful-fs');

const nativeRealpath = gracefulFs.realpathSync.native;

gracefulFs.realpathSync.native = function realpathSyncNativeWithFallback(path, options) {
  try {
    return nativeRealpath.call(this, path, options);
  } catch (error) {
    if (error?.code !== 'EPERM') {
      throw error;
    }

    return fs.realpathSync(path, options);
  }
};
