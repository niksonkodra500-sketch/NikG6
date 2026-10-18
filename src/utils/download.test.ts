import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock Capacitor modules before importing the module under test
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(() => Promise.resolve({ uri: 'file:///cache/test.png' })),
  },
  Directory: { Cache: 'Cache' },
}));

vi.mock('@capacitor/share', () => ({
  Share: { share: vi.fn(() => Promise.resolve()) },
}));

import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { downloadDataUrl, shareDataUrl } from './download';

const mockedCapacitor = vi.mocked(Capacitor);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedWriteFile = vi.mocked(Filesystem.writeFile);
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedShare = vi.mocked(Share.share);

const dataUrl = 'data:image/png;base64,abc123';
const filename = 'test.png';

function setupBrowserEnvironment() {
  mockedCapacitor.isNativePlatform.mockReturnValue(false);

  const anchorMock = {
    href: '',
    download: '',
    click: vi.fn(),
    remove: vi.fn(),
  };
  const appendChildMock = vi.fn();
  vi.stubGlobal('document', {
    createElement: vi.fn(() => anchorMock),
    body: { appendChild: appendChildMock },
  });

  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'content-type': 'image/png' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);

  const fileMock = vi.fn(function (_bits: unknown, name: string, opts?: FilePropertyBag) {
    return { name, type: (opts?.type ?? '').toString() };
  });
  vi.stubGlobal('File', fileMock);

  const shareMock = vi.fn(() => Promise.resolve());
  vi.stubGlobal('navigator', { share: shareMock });

  return { anchorMock, appendChildMock, fetchMock, fileMock, shareMock };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockedCapacitor.isNativePlatform.mockReturnValue(false);
});

describe('downloadDataUrl', () => {
  it('creates an anchor element and clicks it in the browser', () => {
    const { anchorMock, appendChildMock } = setupBrowserEnvironment();
    const documentMock = globalThis.document as unknown as {
      createElement: typeof document.createElement;
      body: { appendChild: typeof document.body.appendChild };
    };

    downloadDataUrl(dataUrl, filename);

    expect(documentMock.createElement).toHaveBeenCalledWith('a');
    expect(anchorMock.href).toBe(dataUrl);
    expect(anchorMock.download).toBe(filename);
    expect(appendChildMock).toHaveBeenCalledWith(anchorMock);
    expect(anchorMock.click).toHaveBeenCalledTimes(1);
    expect(anchorMock.remove).toHaveBeenCalledTimes(1);
  });
});

describe('shareDataUrl', () => {
  it('uses Web Share API when available in the browser', async () => {
    const { shareMock, fetchMock, fileMock } = setupBrowserEnvironment();

    await shareDataUrl(dataUrl, filename);

    expect(fetchMock).toHaveBeenCalledWith(dataUrl);
    expect(fileMock).toHaveBeenCalledWith(
      expect.anything(),
      filename,
      expect.objectContaining({ type: 'image/png' }),
    );
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Edited with NikG6 Photo Editor',
        text: 'Check out my edited photo!',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        files: expect.anything(),
      }),
    );
  });

  it('falls back to download when Web Share API is not available', async () => {
    setupBrowserEnvironment();
    vi.stubGlobal('navigator', {});

    const documentMock = globalThis.document as unknown as {
      createElement: typeof document.createElement;
      body: { appendChild: typeof document.body.appendChild };
    };
    const anchorMock = documentMock.createElement('a') as {
      click: () => void;
      remove: () => void;
    };

    await shareDataUrl(dataUrl, filename);

    expect(anchorMock.click).toHaveBeenCalledTimes(1);
    expect(anchorMock.remove).toHaveBeenCalledTimes(1);
  });
});

describe('native save and share', () => {
  it('writes file and shares via native plugins', async () => {
    mockedCapacitor.isNativePlatform.mockReturnValue(true);

    await shareDataUrl(dataUrl, filename);

    expect(mockedCapacitor.isNativePlatform).toHaveBeenCalled();
    expect(mockedWriteFile).toHaveBeenCalledWith({
      path: filename,
      data: 'abc123',
      directory: 'Cache',
    });
    expect(mockedShare).toHaveBeenCalledWith({
      title: 'Share photo',
      url: 'file:///cache/test.png',
    });
  });
});
