import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no matchMedia — hooks that read it need a stub.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom's Blob implements neither arrayBuffer() nor text(), both of which every
// supported browser has. The export module reads its own output through them.
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function readAsArrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error("Blob read failed"));
      reader.readAsArrayBuffer(this);
    });
  };
}

// jsdom implements neither of these; the scene preview creates an object URL.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => `blob:satquery/${Math.random().toString(16).slice(2)}`;
  URL.revokeObjectURL = () => {};
}

if (!window.scrollTo) {
  Object.defineProperty(window, 'scrollTo', { writable: true, value: () => {} });
}

afterEach(() => cleanup());
