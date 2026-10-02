export function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
