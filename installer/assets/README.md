# Installer branding

All active icons use the approved silver-white faceted metallic AI lettering over the unchanged original gradient. `extension/icon.svg` is the main icon; `icon-menu.svg` uses the same artwork for toolbar and context menus. No theme-dependent bird artwork is active.

Run `node installer/build-icons.cjs` to regenerate branding. `metallic-ai-source.png` preserves the approved source artwork. The SVG uses vector background and clipping with embedded raster metallic faces; it is not a pure-vector illustration.

- `ai-icon.png`: SVG rendered at 256 x 256 with sharp.
- `ai-icon.ico`: transparent Windows icon with 16, 20, 24, 32, 40, 48, 64, 128 and 256 pixel entries.
- `banner.bmp`: 493 x 58 wizard banner; logo at the right, leaving room for native headings.
- `dialog.bmp`: 493 x 312 welcome/completion background; logo in the left 164 pixel panel, native text area white.

The ICO is embedded in the MSI Icon table for Installed apps and the setup-guide shortcut. MSI files in Explorer retain the system file-type icon.
