type VariantOptions = {selectedOptions: {name: string; value: string}[]};

export function findConfiguration<T extends VariantOptions>(
  variants: T[],
  current: Record<string, string>,
  name: string,
  value: string,
): T | undefined {
  return variants.find((variant) =>
    variant.selectedOptions.every(
      (option) =>
        option.value === (option.name === name ? value : current[option.name]),
    ),
  );
}
