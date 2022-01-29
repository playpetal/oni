export function validateCardJSON(object: any) {
  if (!object) return false;
  if (!(typeof object === "object")) return false;

  if (!object.frame || typeof object.frame !== "string") return false;
  if (!object.character || typeof object.character !== "string") return false;
  if (!object.name || typeof object.name !== "string") return false;
  if (!object.id || typeof object.id !== "number") return false;

  return true;
}
