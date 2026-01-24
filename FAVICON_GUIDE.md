# 🎨 Favicon Guide for EmotionWave

## Required Favicon Sizes

For optimal compatibility across all platforms, you need the following favicon files:

### 1. **favicon.ico** (Multi-size ICO file)
- **Sizes**: 16×16, 32×32 (can include 48×48)
- **Format**: ICO (multi-size format)
- **Use**: Browser tabs, bookmarks, Windows taskbar
- **Location**: `/public/favicon.ico`

### 2. **apple-touch-icon-180x180.png** (iOS)
- **Size**: 180×180 pixels
- **Format**: PNG
- **Use**: iOS home screen when users add to home screen
- **Location**: `/public/apple-touch-icon-180x180.png`
- **Note**: iOS automatically adds rounded corners and shadow

### 3. **android-chrome-192x192.png** (PWA - Android)
- **Size**: 192×192 pixels
- **Format**: PNG
- **Use**: Android Chrome home screen, PWA installation
- **Location**: `/public/android-chrome-192x192.png`
- **Purpose**: `any maskable` (Android can crop safely)

### 4. **android-chrome-512x512.png** (PWA - Splash Screen)
- **Size**: 512×512 pixels
- **Format**: PNG
- **Use**: PWA splash screens, Google Search results
- **Location**: `/public/android-chrome-512x512.png`
- **Purpose**: `any maskable` (Android can crop safely)

## Optional (Recommended)

### 5. **icon.svg** (Modern Browsers)
- **Size**: Vector (scales to any size)
- **Format**: SVG
- **Use**: Modern browsers, Safari pinned tabs
- **Location**: `/public/icon.svg`
- **Note**: Currently commented out in `nuxt.config.ts` - uncomment if you create this file

## Design Guidelines

1. **Keep it simple**: Favicons are small - use simple, recognizable shapes
2. **High contrast**: Ensure your icon is visible on both light and dark backgrounds
3. **Square design**: Icons are displayed in square containers (iOS adds rounded corners automatically)
4. **Safe zone**: For maskable icons (192×192 and 512×512), keep important content within the center 80% to avoid cropping on Android

## Tools for Creating Favicons

- **Online Generators**:
  - [Favicon.io](https://favicon.io/) - Generate from text, image, or emoji
  - [RealFaviconGenerator](https://realfavicongenerator.net/) - Comprehensive generator
  - [Favicon Generator](https://rjl.io/favicon-generator/) - All sizes, one click

- **From Image**: Upload a 512×512 PNG and generate all sizes

## Current Status

✅ **favicon.ico** - Exists (16×16, 32×32 ICO format)
✅ **apple-touch-icon-180x180.png** - Exists (180×180)
✅ **android-chrome-192x192.png** - Exists (192×192)
✅ **android-chrome-512x512.png** - Exists (512×512)
❌ **icon.svg** - Optional (not configured)

## Quick Start

1. Create a 512×512 PNG design of your EmotionWave logo/icon
2. Use an online generator to create all sizes from your 512×512 image
3. Place all files in `/public/` directory
4. The configuration is already set up in `nuxt.config.ts` and `manifest.json.ts`
