// TODO: Prompt injection firewall
// - System prompt sanitization
// - Ensure LLM never sets prices or confirms orders
// - Immutable system prompt enforcement

export function sanitizeUserMessage(message: string): string {
  // Strip obvious injection attempts
  const blockedPatterns = [
    /ignore\s+(all\s+)?(previous\s+)?(instructions|rules|prompts)/i,
    /you\s+are\s+(not\s+)?(a\s+)?(bot|ai|assistant)/i,
    /forget\s+(all\s+)?(previous\s+)?(instructions|rules)/i,
    /system\s+prompt/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(message)) {
      return "[Message filtered for security]";
    }
  }

  return message;
}