const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('Copying static assets (js, components) to dist...');
  copyDir('js', 'dist/js');
  copyDir('components', 'dist/components');
  console.log('✅ Static assets copied successfully!');
} catch (err) {
  console.error('Failed to copy static assets:', err);
}
