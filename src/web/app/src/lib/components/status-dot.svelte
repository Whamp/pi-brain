<script lang="ts">
  import { CheckCircle2, XCircle, AlertCircle, Info, CircleDashed, CircleOff, Loader2 } from "lucide-svelte";

  /**
   * StatusDot - Unified status indicator component
   * Uses both color and icons for accessibility (don't rely on color alone).
   */
  interface Props {
    status?: 'success' | 'error' | 'warning' | 'info' | 'offline' | 'loading' | 'connecting';
    size?: number;
    class?: string;
    label?: string; // Optional label for accessibility
  }

  const {
    status = 'info',
    size = 10,
    class: className = '',
    label
  }: Props = $props();

  const iconMap = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
    offline: CircleOff,
    loading: Loader2,
    connecting: CircleDashed
  };

  const Icon = $derived(iconMap[status] || Info);
</script>

<span
  class="status-dot-container {status} {className}"
  style="--size: {size}px"
  title={label}
  role="status"
  aria-label={label}
>
  <Icon size={size} class={status === 'loading' || status === 'connecting' ? 'animate-spin' : ''} strokeWidth={3} />
</span>

<style>
  .status-dot-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
    flex-shrink: 0;
    transition: color 0.2s ease;
  }

  /* Colors based on design tokens */
  .success { color: var(--color-success); }
  .error { color: var(--color-error); }
  .warning { color: var(--color-warning); }
  .info { color: var(--color-info); }
  .offline { color: var(--color-text-subtle); opacity: 0.8; }
  .loading, .connecting { color: var(--color-accent); }

  :global(.animate-spin) {
    animation: status-spin 1.5s linear infinite;
  }

  @keyframes status-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
