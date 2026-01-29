<script lang="ts">
  import { ChevronDown } from "lucide-svelte";

  interface Props {
    value: string;
    label?: string;
    hint?: string;
    hintId?: string;
    disabled?: boolean;
  }

  let {
    value = $bindable(),
    label,
    hint,
    hintId,
    disabled = false,
  }: Props = $props();

  // Common cron presets with human-readable labels
  const PRESETS = [
    { label: "Every hour", cron: "0 * * * *" },
    { label: "Every 6 hours", cron: "0 */6 * * *" },
    { label: "Daily at 2am", cron: "0 2 * * *" },
    { label: "Daily at 3am", cron: "0 3 * * *" },
    { label: "Daily at 4am", cron: "0 4 * * *" },
    { label: "Daily at 5am", cron: "0 5 * * *" },
    { label: "Weekly (Sun 2am)", cron: "0 2 * * 0" },
    { label: "Custom...", cron: null },
  ] as const;

  let inputId = $state(`cron-input-${Math.random().toString(36).slice(2, 9)}`);
  let customInputId = $state(`cron-custom-${Math.random().toString(36).slice(2, 9)}`);
  let showCustom = $state(false);
  let hintElementId = $derived(hintId || `cron-hint-${inputId}`);

  // Determine current preset match or custom
  const matchingPreset = $derived(
    PRESETS.find(p => p.cron === value)
  );

  const isCustom = $derived(!matchingPreset || showCustom);

  const displayValue = $derived(
    matchingPreset && !showCustom
      ? matchingPreset.label
      : "Custom..."
  );

  function handlePresetChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selected = PRESETS.find(p => p.label === select.value);
    
    if (selected?.cron === null) {
      // Switch to custom mode, keep existing value
      showCustom = true;
    } else if (selected?.cron) {
      showCustom = false;
      value = selected.cron;
    }
  }

  function handleCustomChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    ({ value } = input);
  }

  // Convert 24h to 12h format
  function to12Hour(h: number): number {
    if (h === 0) {
      return 12;
    }
    if (h > 12) {
      return h - 12;
    }
    return h;
  }

  // Human-readable description of cron expression
  function describeCron(cron: string): string {
    const parts = cron.split(/\s+/);
    if (parts.length !== 5) {
      return cron;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Every hour
    if (minute === "0" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return "Runs at the start of every hour";
    }

    // Every N hours
    if (minute === "0" && hour.startsWith("*/") && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      const interval = hour.slice(2);
      return `Runs every ${interval} hours`;
    }

    // Daily at specific hour
    if (minute === "0" && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      const h = Number.parseInt(hour, 10);
      const ampm = h < 12 ? "am" : "pm";
      const displayHour = to12Hour(h);
      return `Runs daily at ${displayHour}${ampm}`;
    }

    // Weekly
    if (minute === "0" && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && /^\d+$/.test(dayOfWeek)) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const h = Number.parseInt(hour, 10);
      const d = Number.parseInt(dayOfWeek, 10);
      const ampm = h < 12 ? "am" : "pm";
      const displayHour = to12Hour(h);
      return `Runs ${days[d] ?? `day ${d}`} at ${displayHour}${ampm}`;
    }

    return cron;
  }

  const cronDescription = $derived(describeCron(value));
</script>

<div class="cron-input" class:disabled={disabled}>
  {#if label}
    <label class="cron-input-label" for={inputId}>{label}</label>
  {/if}

  <div class="input-row">
    <div class="select-wrapper">
      <select
        id={inputId}
        value={displayValue}
        onchange={handlePresetChange}
        disabled={disabled}
        aria-label={label ?? "Cron schedule"}
        aria-describedby={hint ? hintElementId : undefined}
      >
        {#each PRESETS as preset}
          <option value={preset.label}>{preset.label}</option>
        {/each}
      </select>
      <ChevronDown class="select-icon" size={16} />
    </div>

    {#if isCustom}
      <input
        type="text"
        id={customInputId}
        class="custom-input"
        value={value}
        oninput={handleCustomChange}
        placeholder="* * * * *"
        disabled={disabled}
        aria-label="Custom cron expression"
        aria-describedby={hint ? hintElementId : undefined}
        spellcheck="false"
      />
    {/if}
  </div>

  <div class="cron-info">
    <code class="cron-value">{value}</code>
    <span class="cron-description">{cronDescription}</span>
  </div>

  {#if hint}
    <span class="cron-input-hint" id={hintElementId}>{hint}</span>
  {/if}
</div>

<style>
  .cron-input {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .cron-input.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .cron-input-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .input-row {
    display: flex;
    gap: var(--space-2);
  }

  .select-wrapper {
    position: relative;
    flex: 1;
    min-width: 160px;
  }

  .select-wrapper select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    padding-right: var(--space-8);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
    appearance: none;
    transition: border-color 0.15s ease;
  }

  .select-wrapper select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .select-wrapper :global(.select-icon) {
    position: absolute;
    right: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--color-text-muted);
  }

  .custom-input {
    flex: 1;
    min-width: 120px;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-family: var(--font-mono);
    color: var(--color-text);
    transition: border-color 0.15s ease;
  }

  .custom-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .custom-input::placeholder {
    color: var(--color-text-subtle);
  }

  .cron-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
  }

  .cron-value {
    padding: var(--space-0-5) var(--space-1-5);
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  .cron-description {
    color: var(--color-text-subtle);
  }

  .cron-input-hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
</style>
