import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TurnstileWidget from './index';

type RenderOptions = {
  sitekey: string;
  appearance: string;
  theme: string;
  language?: string;
  'response-field': boolean;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

// Stand-in for the global Cloudflare's api.js installs.
function installFakeTurnstile() {
  const renderMock = vi.fn((_container: HTMLElement, _options: RenderOptions) => 'widget-1');
  const removeMock = vi.fn();
  window.turnstile = { render: renderMock, remove: removeMock };
  return { renderMock, removeMock };
}

const lastOptions = (renderMock: ReturnType<typeof installFakeTurnstile>['renderMock']) =>
  renderMock.mock.calls[renderMock.mock.calls.length - 1][1];

beforeEach(() => {
  delete window.turnstile;
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  delete window.turnstile;
  vi.restoreAllMocks();
});

describe('TurnstileWidget', () => {
  it('renders an explicit invisible-by-default widget with the given site key and language', async () => {
    const { renderMock } = installFakeTurnstile();
    render(<TurnstileWidget siteKey="0x4AAA" language="es" onToken={() => undefined} />);

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));
    expect(lastOptions(renderMock)).toMatchObject({
      sitekey: '0x4AAA',
      appearance: 'interaction-only',
      theme: 'auto',
      language: 'es',
    });
  });

  it('tells Turnstile not to inject its own hidden input (the form field is ours)', async () => {
    const { renderMock } = installFakeTurnstile();
    render(<TurnstileWidget siteKey="k" onToken={() => undefined} />);

    await waitFor(() => expect(renderMock).toHaveBeenCalled());
    expect(lastOptions(renderMock)['response-field']).toBe(false);
  });

  it("follows the site's own theme toggle", async () => {
    document.documentElement.dataset.theme = 'light';
    const { renderMock } = installFakeTurnstile();
    render(<TurnstileWidget siteKey="k" onToken={() => undefined} />);

    await waitFor(() => expect(renderMock).toHaveBeenCalled());
    expect(lastOptions(renderMock).theme).toBe('light');
  });

  it('reports a token when solved and null when it expires', async () => {
    const { renderMock } = installFakeTurnstile();
    const onToken = vi.fn();
    render(<TurnstileWidget siteKey="k" onToken={onToken} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalled());

    act(() => lastOptions(renderMock).callback('tok-123'));
    expect(onToken).toHaveBeenLastCalledWith('tok-123');

    act(() => lastOptions(renderMock)['expired-callback']());
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it('clears the token and calls onError when the challenge errors', async () => {
    const { renderMock } = installFakeTurnstile();
    const onToken = vi.fn();
    const onError = vi.fn();
    render(<TurnstileWidget siteKey="k" onToken={onToken} onError={onError} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalled());

    act(() => lastOptions(renderMock)['error-callback']());
    expect(onToken).toHaveBeenLastCalledWith(null);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('does not recreate the widget when the parent re-renders with new callbacks', async () => {
    const { renderMock, removeMock } = installFakeTurnstile();
    const { rerender } = render(<TurnstileWidget siteKey="k" onToken={() => undefined} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1));

    const laterOnToken = vi.fn();
    rerender(<TurnstileWidget siteKey="k" onToken={laterOnToken} />);

    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(removeMock).not.toHaveBeenCalled();
    // ...and the *latest* callback is the one that fires.
    act(() => lastOptions(renderMock).callback('tok'));
    expect(laterOnToken).toHaveBeenCalledWith('tok');
  });

  it('removes the widget on unmount', async () => {
    const { renderMock, removeMock } = installFakeTurnstile();
    const { unmount } = render(<TurnstileWidget siteKey="k" onToken={() => undefined} />);
    await waitFor(() => expect(renderMock).toHaveBeenCalled());

    unmount();
    expect(removeMock).toHaveBeenCalledWith('widget-1');
  });

  it('loads api.js when the global is absent, and reports a blocked script via onError', async () => {
    // Capture the injected <script> instead of letting happy-dom fetch it.
    let injected: HTMLScriptElement | undefined;
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      injected = node as HTMLScriptElement;
      return node;
    });
    const onError = vi.fn();
    render(<TurnstileWidget siteKey="k" onToken={() => undefined} onError={onError} />);

    await waitFor(() => expect(injected).toBeDefined());
    expect(injected?.src).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    );

    act(() => {
      injected?.onerror?.(new Event('error'));
    });
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });
});
