import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyStaticAssetsPlugin() {
  return {
    name: 'copy-static-assets-plugin',
    closeBundle() {
      try {
        console.log('Copying static js/ and components/ folders to dist/...');
        const distJs = resolve(__dirname, 'dist/js');
        const srcJs = resolve(__dirname, 'js');
        copyDirSync(srcJs, distJs);

        const distComponents = resolve(__dirname, 'dist/components');
        const srcComponents = resolve(__dirname, 'components');
        copyDirSync(srcComponents, distComponents);
        console.log('Static folders copied successfully!');
      } catch (err) {
        console.error('Error copying static assets:', err);
      }
    }
  };
}

function getHtmlInputs() {
  const inputs = {
    main: resolve(__dirname, 'index.html')
  };
  const pagesDir = resolve(__dirname, 'pages');

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (!entry.name.endsWith('.html')) {
        continue;
      }

      const relPath = path.relative(pagesDir, entryPath);
      const inputKey = relPath
        .replace(/\.html$/i, '')
        .replace(/[\\/]+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '_');

      inputs[inputKey] = entryPath;
    }
  }

  walk(pagesDir);
  return inputs;
}

export default defineConfig({
  plugins: [
    // Fix: Resolve the QR scanner worker import that Vite can't handle.
    // The qr-scanner.umd.min.js uses import("./qr-scanner-worker.min.js")
    // which Vite intercepts but can't resolve. This plugin resolves
    // the import to the actual file location.
    {
      name: 'fix-qr-scanner-worker-import',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === './qr-scanner-worker.min.js' && importer && importer.includes('qr-scanner')) {
          // Resolve to the actual file path in the vendor directory
          return resolve(__dirname, 'js/vendor/qr-scanner-worker.min.js');
        }
      }
    },
    copyStaticAssetsPlugin()
  ],
  server: {
    hmr: {
      overlay: true
    }
  },
  build: {
    rollupOptions: {
      input: getHtmlInputs()
    }
  }
});
