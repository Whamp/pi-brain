<script lang="ts">
  import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-svelte";

  interface Props {
    direction: "asc" | "desc" | null;
    size?: number;
  }

  let { direction = null, size = 12 }: Props = $props();
</script>

<span class="sort-icon" class:active={direction !== null}>
  {#if direction === "asc"}
    <ArrowUp {size} />
  {:else if direction === "desc"}
    <ArrowDown {size} />
  {:else}
    <ArrowUpDown {size} />
  {/if}
</span>

<style>
  .sort-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: currentColor;
  }
</style>
