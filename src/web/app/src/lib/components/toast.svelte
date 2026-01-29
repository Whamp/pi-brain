<script lang="ts">
  import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-svelte";
  import { toasts, toastStore, type ToastType } from "$lib/stores/toast";
  import { fly, scale, fade } from "svelte/transition";
  import { elasticOut, cubicOut } from "svelte/easing";

  const icons: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  // Different entrance animations per toast type for visual variety
  const entranceConfig: Record<ToastType, { x: number; y: number; duration: number }> = {
    success: { x: 0, y: -50, duration: 400 }, // Drop from above
    error: { x: 100, y: 0, duration: 300 }, // Slide from right (urgent)
    warning: { x: 50, y: -30, duration: 350 }, // Diagonal slide
    info: { x: 100, y: 0, duration: 250 }, // Quick slide from right
  };
</script>

<div class="toast-container" aria-live="polite" aria-label="Notifications">
  {#each $toasts as toast (toast.id)}
    {@const entrance = entranceConfig[toast.type]}
    <div
      class="toast toast-{toast.type}"
      class:toast-success-pulse={toast.type === "success"}
      role="alert"
      in:fly={{ x: entrance.x, y: entrance.y, duration: entrance.duration, easing: cubicOut }}
      out:scale={{ duration: 150, start: 0.95, opacity: 0 }}
    >
      <!-- Success confetti particles -->
      {#if toast.type === "success"}
        <div class="confetti-container" aria-hidden="true">
          <div class="confetti confetti-1"></div>
          <div class="confetti confetti-2"></div>
          <div class="confetti confetti-3"></div>
          <div class="confetti confetti-4"></div>
          <div class="confetti confetti-5"></div>
          <div class="confetti confetti-6"></div>
          <div class="confetti confetti-7"></div>
          <div class="confetti confetti-8"></div>
        </div>
        <div class="success-glow" aria-hidden="true"></div>
      {/if}

      <div class="toast-icon-wrapper toast-icon-{toast.type}">
        <svelte:component this={icons[toast.type]} size={18} class="toast-icon" />
      </div>
      <span class="toast-message">{toast.message}</span>
      <button
        type="button"
        class="toast-dismiss"
        onclick={() => toastStore.dismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      <div
        class="toast-progress toast-progress-{toast.type}"
        style="animation-duration: {toast.duration}ms"
      ></div>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 400px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: rgba(20, 20, 23, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl), var(--shadow-highlight);
    font-size: var(--text-sm);
    pointer-events: auto;
    position: relative;
    overflow: hidden;
  }

  /* Icon wrapper for pulse animation */
  .toast-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .toast-icon-success {
    animation: icon-pop 0.5s ease-out;
  }

  .toast-icon-error {
    animation: icon-shake 0.4s ease-out;
  }

  .toast-icon-warning {
    animation: icon-wobble 0.5s ease-out;
  }

  .toast-icon-info {
    animation: icon-fade-scale 0.3s ease-out;
  }

  @keyframes icon-pop {
    0% { transform: scale(0); }
    50% { transform: scale(1.3); }
    75% { transform: scale(0.9); }
    100% { transform: scale(1); }
  }

  @keyframes icon-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-3px); }
    40% { transform: translateX(3px); }
    60% { transform: translateX(-2px); }
    80% { transform: translateX(2px); }
  }

  @keyframes icon-wobble {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    50% { transform: rotate(10deg); }
    75% { transform: rotate(-5deg); }
    100% { transform: rotate(0deg); }
  }

  @keyframes icon-fade-scale {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  /* Success toast enhancements */
  .toast-success {
    border-left: 3px solid var(--color-success);
    background: linear-gradient(135deg, rgba(20, 20, 23, 0.85) 0%, rgba(74, 222, 128, 0.1) 100%);
  }

  .toast-success :global(.toast-icon) {
    color: var(--color-success);
  }

  /* Success pulse effect on the whole toast */
  .toast-success-pulse {
    animation: success-pulse 0.6s ease-out;
  }

  @keyframes success-pulse {
    0% {
      box-shadow:
        var(--shadow-xl),
        var(--shadow-highlight),
        0 0 0 0 rgba(74, 222, 128, 0.4);
    }
    50% {
      box-shadow:
        var(--shadow-xl),
        var(--shadow-highlight),
        0 0 0 8px rgba(74, 222, 128, 0);
    }
    100% {
      box-shadow:
        var(--shadow-xl),
        var(--shadow-highlight),
        0 0 0 0 rgba(74, 222, 128, 0);
    }
  }

  /* Success glow behind the toast */
  .success-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at center, rgba(74, 222, 128, 0.15) 0%, transparent 50%);
    animation: glow-fade 1s ease-out forwards;
    pointer-events: none;
  }

  @keyframes glow-fade {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  /* Confetti particles for success toast */
  .confetti-container {
    position: absolute;
    top: 50%;
    left: 20px;
    width: 20px;
    height: 20px;
    pointer-events: none;
  }

  .confetti {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    opacity: 0;
    animation: confetti-burst 0.8s ease-out forwards;
  }

  .confetti-1 {
    background: var(--color-success);
    animation-delay: 0ms;
    --angle: 0deg;
    --distance: 30px;
  }

  .confetti-2 {
    background: var(--color-accent);
    animation-delay: 50ms;
    --angle: 45deg;
    --distance: 35px;
  }

  .confetti-3 {
    background: #fbbf24;
    animation-delay: 100ms;
    --angle: 90deg;
    --distance: 25px;
  }

  .confetti-4 {
    background: var(--color-success);
    animation-delay: 75ms;
    --angle: 135deg;
    --distance: 32px;
  }

  .confetti-5 {
    background: #f472b6;
    animation-delay: 25ms;
    --angle: 180deg;
    --distance: 28px;
  }

  .confetti-6 {
    background: var(--color-accent);
    animation-delay: 125ms;
    --angle: 225deg;
    --distance: 30px;
  }

  .confetti-7 {
    background: #a78bfa;
    animation-delay: 60ms;
    --angle: 270deg;
    --distance: 26px;
  }

  .confetti-8 {
    background: var(--color-success);
    animation-delay: 90ms;
    --angle: 315deg;
    --distance: 33px;
  }

  @keyframes confetti-burst {
    0% {
      opacity: 1;
      transform: translate(0, 0) scale(1);
    }
    100% {
      opacity: 0;
      transform: 
        translate(
          calc(cos(var(--angle)) * var(--distance)), 
          calc(sin(var(--angle)) * var(--distance))
        ) 
        scale(0);
    }
  }

  /* Error toast */
  .toast-error {
    border-left: 3px solid var(--color-error);
    background: linear-gradient(135deg, rgba(20, 20, 23, 0.85) 0%, rgba(239, 68, 68, 0.1) 100%);
  }

  .toast-error :global(.toast-icon) {
    color: var(--color-error);
  }

  /* Warning toast */
  .toast-warning {
    border-left: 3px solid var(--color-warning, #f59e0b);
    background: linear-gradient(135deg, rgba(20, 20, 23, 0.85) 0%, rgba(245, 158, 11, 0.1) 100%);
  }

  .toast-warning :global(.toast-icon) {
    color: var(--color-warning, #f59e0b);
  }

  /* Info toast */
  .toast-info {
    border-left: 3px solid var(--color-accent);
    background: linear-gradient(135deg, rgba(20, 20, 23, 0.85) 0%, rgba(0, 217, 255, 0.1) 100%);
  }

  .toast-info :global(.toast-icon) {
    color: var(--color-accent);
  }

  .toast-message {
    flex: 1;
    color: var(--color-text);
    line-height: 1.4;
  }

  .toast-dismiss {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
  }

  .toast-dismiss:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
    transform: scale(1.1);
  }

  .toast-dismiss:active {
    transform: scale(0.95);
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: currentColor;
    opacity: 0.4;
    animation: shrink linear forwards;
  }

  .toast-progress-success {
    background: var(--color-success);
  }

  .toast-progress-error {
    background: var(--color-error);
  }

  .toast-progress-warning {
    background: var(--color-warning, #f59e0b);
  }

  .toast-progress-info {
    background: var(--color-accent);
  }

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  /* Mobile responsiveness - toasts slide up from bottom */
  @media (max-width: 480px) {
    .toast-container {
      top: auto;
      bottom: var(--space-4);
      left: var(--space-4);
      right: var(--space-4);
      max-width: none;
    }

    .toast {
      /* Slightly smaller on mobile */
      padding: var(--space-2) var(--space-3);
    }
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .toast-icon-success,
    .toast-icon-error,
    .toast-icon-warning,
    .toast-icon-info {
      animation: none;
    }

    .toast-success-pulse {
      animation: none;
    }

    .confetti {
      display: none;
    }

    .success-glow {
      display: none;
    }
  }
</style>
