import { RegexPresets, type RegexPreset } from "@/features/scraper-generation/interfaces/output-config.interfaces";

export const RegexPresetFormOptions: { id: RegexPreset; label: string }[] = [
  { id: RegexPresets.EMAIL, label: "Email" },
  { id: RegexPresets.PHONE, label: "Phone" },
  { id: RegexPresets.URL, label: "URL" },
  { id: RegexPresets.CUSTOM, label: "Custom regex" },
];
