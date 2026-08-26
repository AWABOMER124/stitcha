import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const source = resolve(root, 'merchant-os/public/brand/wasla-symbol.svg');
const write = (path, size) => sharp(source).resize(size, size).png().toFile(resolve(root, path));

const outputs = [
  ['web/favicon.png', 32], ['web/icons/Icon-192.png', 192], ['web/icons/Icon-512.png', 512],
  ['web/icons/Icon-maskable-192.png', 192], ['web/icons/Icon-maskable-512.png', 512],
  ['android/app/src/main/res/mipmap-mdpi/ic_launcher.png', 48],
  ['android/app/src/main/res/mipmap-hdpi/ic_launcher.png', 72],
  ['android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', 96],
  ['android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', 144],
  ['android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', 192],
];

for (const platform of ['ios/Runner/Assets.xcassets/AppIcon.appiconset', 'macos/Runner/Assets.xcassets/AppIcon.appiconset']) {
  for (const name of await readdir(resolve(root, platform))) {
    const iosMatch = name.match(/(\d+(?:\.\d+)?)x\1(?:@(\d+)x)?\.png$/);
    const macMatch = name.match(/^app_icon_(\d+)\.png$/);
    if (iosMatch) {
      outputs.push([`${platform}/${name}`, Math.round(Number(iosMatch[1]) * Number(iosMatch[2] ?? 1))]);
    } else if (macMatch) {
      outputs.push([`${platform}/${name}`, Number(macMatch[1])]);
    }
  }
}

await Promise.all(outputs.map(([path, size]) => write(path, size)));
console.log(`Generated ${outputs.length} WASLA brand icons.`);
