export const RegexFlagsFormOptions: { id: string; label: string; description: string }[] = [
  { id: "", label: "Default", description: "Case-sensitive, single-line matching" },
  { id: "i", label: "i", description: "Case-insensitive — also matches different letter casing" },
  { id: "m", label: "m", description: "Multiline — ^ and $ match the start/end of each line" },
  { id: "s", label: "s", description: "Dot matches newline — . also matches line breaks" },
  { id: "im", label: "im", description: "Case-insensitive + multiline" },
  { id: "is", label: "is", description: "Case-insensitive + dot matches newline" },
  { id: "u", label: "u", description: "Unicode-aware — handles unicode escapes correctly" },
  { id: "iu", label: "iu", description: "Case-insensitive + unicode-aware" },
];
