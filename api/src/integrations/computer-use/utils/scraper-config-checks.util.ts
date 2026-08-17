function normalizeFieldValue(
  value: string | string[] | null | undefined,
): string | null {
  if (value == null) return null;
  const joined = Array.isArray(value) ? value.join(' ') : value;
  const trimmed = joined.replace(/\s+/g, ' ').trim();
  return trimmed || null;
}

export function findDisjointnessErrors(
  textFieldValues: Record<string, string | string[] | null | undefined>,
  cardLabel: string,
): string[] {
  const errors: string[] = [];
  const entries = Object.entries(textFieldValues)
    .map(([name, value]) => [name, normalizeFieldValue(value)] as const)
    .filter((entry): entry is [string, string] => entry[1] !== null);

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [nameA, valueA] = entries[i];
      const [nameB, valueB] = entries[j];
      if (valueA === valueB) {
        errors.push(
          `${cardLabel}: fields "${nameA}" and "${nameB}" resolve to the same value ("${valueA.slice(0, 80)}") — they must use distinct selectors`,
        );
      }
    }
  }

  return errors;
}

export function isBareDataUri(
  value: string | string[] | null | undefined,
): boolean {
  const first = Array.isArray(value) ? value[0] : value;
  return (
    typeof first === 'string' && first.trim().toLowerCase().startsWith('data:')
  );
}
