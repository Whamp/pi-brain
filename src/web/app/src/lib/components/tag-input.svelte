<script lang="ts">
  import { X } from "lucide-svelte";
  import TagComponent from "./tag.svelte";

  interface Props {
    value: string[];
    label?: string;
    placeholder?: string;
    hint?: string;
    hintId?: string;
    disabled?: boolean;
  }

  let {
    value = $bindable(),
    label,
    placeholder = "Type and press Enter...",
    hint,
    hintId,
    disabled = false,
  }: Props = $props();

  let newTag = $state("");
  let inputElement: HTMLInputElement | undefined;
  let inputId = $state(`tag-input-${Math.random().toString(36).slice(2, 9)}`);
  let hintElementId = $derived(hintId || `tag-hint-${inputId}`);

  function addTag(): void {
    const trimmed = newTag.trim();

    if (trimmed && !value.includes(trimmed)) {
      value = [...value, trimmed];
    }

    newTag = "";
    inputElement?.focus();
  }

  function removeTag(index: number): void {
    value = value.filter((_, i) => i !== index);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && !newTag && value.length > 0) {
      // Remove last tag on backspace when input is empty
      removeTag(value.length - 1);
    }
  }
</script>

<div class="tag-input" class:disabled={disabled}>
  {#if label}
    <label class="tag-input-label" for={inputId}>{label}</label>
  {/if}

  <div class="tag-container">
    {#each value as tag, i}
      <TagComponent variant="accent" className={disabled ? 'disabled' : ''}>
        <span class="tag-text">{tag}</span>
        <button
          type="button"
          class="tag-remove"
          onclick={() => removeTag(i)}
          disabled={disabled}
          aria-label={`Remove ${tag}`}
        >
          <X size={12} />
        </button>
      </TagComponent>
    {/each}

    <input
      type="text"
      id={inputId}
      bind:this={inputElement}
      bind:value={newTag}
      {placeholder}
      disabled={disabled}
      onkeydown={handleKeydown}
      aria-label="Add new tag"
      aria-describedby={hint ? hintElementId : undefined}
    />
  </div>

  {#if hint}
    <span class="tag-input-hint" id={hintElementId}>{hint}</span>
  {/if}
</div>

<style>
  .tag-input {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .tag-input.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .tag-input-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .tag-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-height: 40px;
    align-items: center;
    transition: border-color 0.15s ease;
  }

  .tag-container:focus-within {
    border-color: var(--color-accent);
  }

  .tag-text {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    border-radius: 50%;
    transition: background 0.15s ease;
  }

  .tag-remove:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.1);
  }

  .tag-container input {
    flex: 1;
    min-width: 120px;
    padding: 0;
    background: transparent;
    border: none;
    font-size: var(--text-sm);
    color: var(--color-text);
    outline: none;
  }

  .tag-container input::placeholder {
    color: var(--color-text-subtle);
  }

  .tag-input-hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
</style>
