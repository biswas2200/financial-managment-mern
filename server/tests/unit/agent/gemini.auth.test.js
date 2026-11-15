import { describe, it, expect, vi } from 'vitest';
import { resolveGeminiAuth } from '../../../src/config/gemini-auth.js';
import { createGeminiClient } from '../../../src/agent/providers/gemini.provider.js';

describe('resolveGeminiAuth (API key or Google Application Default Credentials)', () => {
  it('is off when nothing is configured, so Copilot falls back to the offline engine', () => {
    expect(resolveGeminiAuth({})).toBeNull();
  });

  it('uses an API key when there is one', () => {
    expect(resolveGeminiAuth({ GEMINI_API_KEY: 'k-123' })).toEqual({ mode: 'api-key', apiKey: 'k-123' });
  });

  it('uses Application Default Credentials (Vertex AI) when a Google Cloud project is set', () => {
    expect(resolveGeminiAuth({ GOOGLE_CLOUD_PROJECT: 'my-proj' })).toEqual({ mode: 'adc', project: 'my-proj', location: 'us-central1' });
    expect(resolveGeminiAuth({ GOOGLE_CLOUD_PROJECT: 'my-proj', GOOGLE_CLOUD_LOCATION: 'europe-west4' })).toMatchObject({ location: 'europe-west4' });
  });

  it('prefers the API key unless GEMINI_AUTH=adc asks for ADC', () => {
    const both = { GEMINI_API_KEY: 'k', GOOGLE_CLOUD_PROJECT: 'my-proj' };
    expect(resolveGeminiAuth(both).mode).toBe('api-key');
    expect(resolveGeminiAuth({ ...both, GEMINI_AUTH: 'adc' }).mode).toBe('adc');
  });

  it('does not guess: GEMINI_AUTH=adc without a project is not usable', () => {
    expect(resolveGeminiAuth({ GEMINI_AUTH: 'adc' })).toBeNull();
  });
});

describe('createGeminiClient', () => {
  it('passes the key straight to the SDK', () => {
    const Sdk = vi.fn();
    createGeminiClient({ mode: 'api-key', apiKey: 'k-123' }, Sdk);
    expect(Sdk).toHaveBeenCalledWith({ apiKey: 'k-123' });
  });

  it('asks the SDK for Vertex AI with the project and region, and no key, so Google ADC does the signing', () => {
    const Sdk = vi.fn();
    createGeminiClient({ mode: 'adc', project: 'my-proj', location: 'us-central1' }, Sdk);
    expect(Sdk).toHaveBeenCalledWith({ vertexai: true, project: 'my-proj', location: 'us-central1' });
  });
});
