# WisePath logo

`wisepath-logo-source.jpg` is the official logo (white background). Every logo file the website and the Android app use is generated from it:

| Output | Used for |
|---|---|
| `apps/admin-web/public/brand/wisepath-logo.png` | Sign-in page (full logo) |
| `apps/admin-web/public/brand/wisepath-mark.png`, `wisepath-wordmark.png` | Sidebar and header lockup |
| `apps/admin-web/public/favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Browser tab and bookmarks |
| `apps/mobile/assets/icon.png`, `adaptive-icon.png`, `splash.png` | Android launcher icon and splash screen |
| `apps/mobile/assets/brand/*.png` | Welcome and sign-in screens |

The current source is only 256×256 px, so the Android launcher icon is upscaled. To use a sharper version, replace `wisepath-logo-source.jpg` with a larger square image (1024 px or more, same layout) and regenerate (needs Python with Pillow):

```bash
python brand/make_logo_assets.py brand/wisepath-logo-source.jpg apps/admin-web/public apps/mobile/assets
```

The crop for the mark (cap + book) assumes the lettering starts at about 72% of the image height, as in the current logo.
