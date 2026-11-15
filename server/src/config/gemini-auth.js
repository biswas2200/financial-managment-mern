/**
 * How Copilot signs in to Google Gemini.
 *
 *  - API key:  GEMINI_API_KEY (Google AI Studio).
 *  - ADC:      Google Application Default Credentials against Vertex AI. No key is stored:
 *              the Google SDK picks up `gcloud auth application-default login`, a service
 *              account (GOOGLE_APPLICATION_CREDENTIALS) or the metadata server on Google Cloud.
 *              Needs GOOGLE_CLOUD_PROJECT (and optionally GOOGLE_CLOUD_LOCATION).
 *
 * An API key wins when both are present, unless GEMINI_AUTH=adc asks for ADC explicitly.
 * Returns null when neither is configured, so Copilot answers with its offline engine.
 */
export function resolveGeminiAuth(source = process.env) {
  const apiKey = (source.GEMINI_API_KEY ?? '').trim();
  const project = (source.GOOGLE_CLOUD_PROJECT ?? '').trim();
  const forceAdc = (source.GEMINI_AUTH ?? '').trim().toLowerCase() === 'adc';

  if (apiKey && !forceAdc) return { mode: 'api-key', apiKey };
  if (project) return { mode: 'adc', project, location: (source.GOOGLE_CLOUD_LOCATION ?? '').trim() || 'us-central1' };
  return null;
}
