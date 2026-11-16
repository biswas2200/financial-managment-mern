import { Monitor, Sun, Moon } from 'lucide-react';
import { useAssistantStatus } from '../../api/hooks.js';
import { useTheme } from '../../app/theme.jsx';
import { Segmented } from '../../components/ui/primitives.jsx';
import { EngineBadge } from '../assistant/CopilotChat.jsx';
import { Section } from './SettingsSection.jsx';

export default function PreferencesSettings() {
  const { preference, setTheme } = useTheme();
  const { data: status } = useAssistantStatus();

  return (
    <>
      <Section title="Appearance" description="Follow your device, or pick a theme.">
        <Segmented
          label="Theme"
          value={preference}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'System', icon: <Monitor size={16} aria-hidden /> },
            { value: 'light', label: 'Light', icon: <Sun size={16} aria-hidden /> },
            { value: 'dark', label: 'Dark', icon: <Moon size={16} aria-hidden /> },
          ]}
        />
      </Section>
      <Section title="Copilot engine" description="Which engine is answering your questions.">
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <EngineBadge status={status} />
          <p>
            {status?.provider === 'gemini'
              ? `Connected to Google Gemini (${status.model}) ${status.auth === 'adc' ? 'through your Google Cloud sign-in (Application Default Credentials), so no API key is stored' : 'with an API key'}. Your questions and the figures Copilot looks up are sent to Gemini to write each answer.`
              : 'Gemini is not set up on the server (no API key or Google Cloud project), so Copilot answers with its built-in offline engine.'}
          </p>
        </div>
      </Section>
    </>
  );
}
