import '@testing-library/jest-dom';

// Mock electron APIs
global.window = Object.create(window);
Object.defineProperty(window, 'electronAPI', {
  value: {
    toggleOverlay: jest.fn(),
    openMainWindow: jest.fn(),
    setShortcut: jest.fn().mockResolvedValue({ success: true }),
    getSettings: jest.fn().mockResolvedValue({}),
    saveSettings: jest.fn().mockResolvedValue(undefined),
    // Add other electron API methods as needed
  },
  writable: true
});

// Mock DOM methods that aren't available in Jest
Element.prototype.scrollIntoView = jest.fn();