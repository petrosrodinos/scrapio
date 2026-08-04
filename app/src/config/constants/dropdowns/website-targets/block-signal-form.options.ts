import type { BlockSignal } from "@/features/website-targets/interfaces/website-targets.interfaces";

export const BlockSignalFormOptions: {
  id: BlockSignal;
  label: string;
}[] = [
  { id: "BLOCKED", label: "Blocked (stop immediately)" },
  { id: "CHALLENGE", label: "Challenge (wait for clearance)" },
];

export function getBlockSignalLabel(signal: BlockSignal | string): string {
  return (
    BlockSignalFormOptions.find((option) => option.id === signal)?.label ??
    signal
  );
}
