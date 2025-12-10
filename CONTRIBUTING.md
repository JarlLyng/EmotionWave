# Contributing to EmotionWave

Thank you for your interest in contributing to EmotionWave! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/EmotionWave.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes locally
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to your branch: `git push origin feature/your-feature-name`
8. Open a Pull Request

## 📋 Development Setup

See the main [README.md](README.md) for quick start instructions.

For detailed information, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [CONFIGURATION.md](./CONFIGURATION.md) - Configuration options
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guides

## 🎨 Code Style

### TypeScript
- Use TypeScript for all new code
- Provide proper type annotations
- Avoid `any` types where possible

### Vue Components
- Use Composition API (`<script setup>`)
- Keep components focused and single-purpose
- Use props and emits for component communication
- Add proper prop validation

### Composables
- Use composables for reusable logic
- Return reactive refs, not plain values
- Clean up resources in `onUnmounted` hooks

### Styling
- Use TailwindCSS utility classes
- Keep custom CSS minimal
- Use scoped styles when needed
- Follow mobile-first responsive design

## 🧪 Testing

Before submitting a PR:

- [ ] Test on desktop browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Verify audio works after user interaction
- [ ] Check that sentiment updates correctly
- [ ] Ensure no console errors
- [ ] Test offline functionality (service worker)

## 📝 Commit Messages

Use clear, descriptive commit messages:

- `feat: Add new feature`
- `fix: Fix bug description`
- `docs: Update documentation`
- `refactor: Refactor code`
- `perf: Performance improvement`
- `style: Code style changes`

## 🔍 Pull Request Process

1. **Update Documentation**: Update relevant documentation files:
   - [README.md](./README.md) - Quick start and overview
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - If architecture changes
   - [CONFIGURATION.md](./CONFIGURATION.md) - If configuration changes
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - If deployment changes
2. **Add Comments**: Comment complex logic
3. **Test Thoroughly**: Test all affected features
4. **Check Build**: Ensure `npm run generate` succeeds
5. **Describe Changes**: Clearly describe what and why in PR description

## 🐛 Reporting Bugs

When reporting bugs, please include:

- Browser and version
- Device and OS
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable

## 💡 Feature Requests

For feature requests:

- Describe the feature clearly
- Explain the use case
- Consider implementation complexity
- Discuss in an issue before implementing

## 📦 Project Structure

- `/components` - Vue components
- `/composables` - Reusable composables
- `/pages` - Nuxt pages
- `/server/api` - Server-side API routes
- `/public` - Static assets
- `/assets` - Build-time assets

## 🎯 Areas for Contribution

- Performance optimizations
- Additional visual effects
- Improved error handling
- Better mobile experience
- Accessibility improvements
- Documentation improvements
- Test coverage

## ❓ Questions?

Open an issue for questions or discussions. We're happy to help!

Thank you for contributing! 🎉

