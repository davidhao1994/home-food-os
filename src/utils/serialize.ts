export function jsonResponse<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}
