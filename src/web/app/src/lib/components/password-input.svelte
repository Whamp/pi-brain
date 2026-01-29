<script lang="ts">
  import { Eye, EyeOff } from "lucide-svelte";

  interface Props {
    value: string;
    label?: string;
    placeholder?: string;
    hint?: string;
    disabled?: boolean;
    hasExistingValue?: boolean;
  }

  let {
    value = $bindable(),
    label,
    placeholder = "Enter API key...",
    hint,
    disabled = false,
    hasExistingValue = false,
  }: Props = $props();

  let showPassword = $state(false);
  let inputId = $state(`password-input-${Math.random().toString(36).slice(2, 9)}`);

  function toggleVisibility(): void {
    showPassword = !showPassword;
  }

  // Derive the display status
  function getStatusText(val: string, existingVal: boolean): string {
    if (val) {
      return "New key entered";
    }
    if (existingVal) {
      return "Key is set (hidden)";
    }
    return "No key configured";
  }

  function getStatusClass(val: string, existingVal: boolean): string {
    if (val) {
      return "status-changed";
    }
    if (existingVal) {
      return "status-set";
    }
    return "status-empty";
  }

  const statusText = $derived(getStatusText(value, hasExistingValue));

  const statusClass = $derived(getStatusClass(value, hasExistingValue));
</script>

<div class="password-input" class:disabled={disabled}>
  {#if label}
    <label class="password-input-label" for={inputId}>{label}</label>
  {/if}

  <div class="input-wrapper">
    <input
      type={showPassword ? "text" : "password"}
      id={inputId}
      bind:value={value}
      placeholder={placeholder}
      disabled={disabled}
      autocomplete="off"
      spellcheck="false"
    />
    <button
      type="button"
      class="toggle-btn"
      onclick={toggleVisibility}
      disabled={disabled}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {#if showPassword}
        <EyeOff size={16} />
      {:else}
        <Eye size={16} />
      {/if}
    </button>
  </div>

  <div class="status-row">
    <span class="status-indicator {statusClass}"></span>
    <span class="status-text">{statusText}</span>
  </div>

  {#if hint}
    <span class="password-input-hint">{hint}</span>
  {/if}
</div>

<style>
  .password-input {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .password-input.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .password-input-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: border-color 0.15s ease;
  }

  .input-wrapper:focus-within {
    border-color: var(--color-accent);
  }

  .input-wrapper input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    font-size: var(--text-sm);
    font-family: var(--font-mono);
    color: var(--color-text);
    outline: none;
    min-width: 0;
  }

  .input-wrapper input::placeholder {
    color: var(--color-text-subtle);
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    margin-right: var(--space-1);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: color 0.15s ease, background 0.15s ease;
  }

  .toggle-btn:hover:not(:disabled) {
    color: var(--color-text);
    background: var(--color-bg-hover);
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-indicator.status-set {
    background: var(--color-success, #22c55e);
  }

  .status-indicator.status-changed {
    background: var(--color-warning, #f59e0b);
  }

  .status-indicator.status-empty {
    background: var(--color-text-subtle);
  }

  .status-text {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .password-input-hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
</style>
