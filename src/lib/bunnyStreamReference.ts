export const bunnyStreamPrefix = "bunny-stream:";

export function isBunnyStreamReference(value?: string | null) {
  return Boolean(value?.startsWith(bunnyStreamPrefix));
}
