const fs = require('node:fs');
const sharp = require('sharp');

// Preserve the approved metallic faces within clean vector outlines.
const letters = 'M170 884L419 334H573L767 884H635L594 774H389L341 884Z M440 655H535L493 485Z M767 884L920 334H1080L929 884Z';
const image = fs.readFileSync('installer/assets/metallic-ai-source.png').toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
<defs><linearGradient id="color" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06b6d4"/><stop offset=".48" stop-color="#6366f1"/><stop offset="1" stop-color="#d946ef"/></linearGradient>
<clipPath id="letters"><path d="${letters}" clip-rule="evenodd"/></clipPath>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="125%"><feGaussianBlur stdDeviation="6"/></filter></defs>
<rect x="2" y="2" width="60" height="60" rx="16" fill="url(#color)"/>
<g transform="scale(${64 / 1254})"><path d="${letters}" fill-rule="evenodd" fill="#28324c" opacity=".28" transform="translate(0 8)" filter="url(#shadow)"/>
<image width="1254" height="1254" href="data:image/png;base64,${image}" clip-path="url(#letters)"/></g></svg>`;

async function bmp(svgContent, width, height, path) {
  const { data } = await sharp(Buffer.from(svgContent)).resize(width, height).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const stride = Math.ceil(width * 3 / 4) * 4;
  const out = Buffer.alloc(54 + stride * height);
  out.write('BM'); out.writeUInt32LE(out.length, 2); out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14); out.writeInt32LE(width, 18); out.writeInt32LE(height, 22);
  out.writeUInt16LE(1, 26); out.writeUInt16LE(24, 28); out.writeUInt32LE(stride * height, 34);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const src = (y * width + x) * 3, dst = 54 + (height - 1 - y) * stride + x * 3;
    out[dst] = data[src + 2]; out[dst + 1] = data[src + 1]; out[dst + 2] = data[src];
  }
  fs.writeFileSync(path, out);
}

(async () => {
  for (const name of ['icon.svg', 'icon-menu.svg', 'icon-light.svg', 'icon-dark.svg']) fs.writeFileSync('extension/' + name, svg);
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  fs.writeFileSync('installer/assets/ai-icon.png', png);
  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];
  const frames = await Promise.all(sizes.map(size => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * sizes.length); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  frames.forEach((frame, i) => {
    const start = 6 + i * 16; header[start] = header[start + 1] = sizes[i] % 256;
    header.writeUInt16LE(1, start + 4); header.writeUInt16LE(32, start + 6);
    header.writeUInt32LE(frame.length, start + 8); header.writeUInt32LE(offset, start + 12); offset += frame.length;
  });
  fs.writeFileSync('installer/assets/ai-icon.ico', Buffer.concat([header, ...frames]));
  const logo = 'data:image/png;base64,' + png.toString('base64');
  await bmp(`<svg xmlns="http://www.w3.org/2000/svg" width="493" height="58"><rect width="493" height="58" fill="white"/><image href="${logo}" x="435" y="5" width="48" height="48"/></svg>`, 493, 58, 'installer/assets/banner.bmp');
  await bmp(`<svg xmlns="http://www.w3.org/2000/svg" width="493" height="312"><defs><linearGradient id="panel" x2="0" y2="1"><stop stop-color="#eff8ff"/><stop offset="1" stop-color="#f5f1ff"/></linearGradient></defs><rect width="493" height="312" fill="white"/><rect width="164" height="312" fill="url(#panel)"/><image href="${logo}" x="27" y="86" width="110" height="110"/></svg>`, 493, 312, 'installer/assets/dialog.bmp');
  fs.mkdirSync('output/imagegen', { recursive: true });
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('output/imagegen/metallic-ai-final.png');
  console.log('Updated extension, menu and Windows installer branding.');
})();
