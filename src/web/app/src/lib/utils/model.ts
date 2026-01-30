/**
 * Abbreviates a model name by extracting just the model identifier.
 *
 * Examples:
 * - "google-antigravity/claude-opus-4-5-thinking" -> "claude-opus-4-5-thinking"
 * - "anthropic/claude-sonnet-4-20250514" -> "claude-sonnet-4"
 * - "openai/gpt-4o" -> "gpt-4o"
 * - "claude-3-opus" -> "claude-3-opus" (no provider prefix)
 */
export function abbreviateModelName(fullName: string): string {
  if (!fullName) {
    return "Unknown";
  }

  // Remove provider prefix (everything before the last /)
  const lastSlash = fullName.lastIndexOf("/");
  let modelPart = lastSlash === -1 ? fullName : fullName.slice(lastSlash + 1);

  // Remove date suffixes (e.g., "-20250514")
  modelPart = modelPart.replace(/-\d{8}$/, "");

  return modelPart;
}
