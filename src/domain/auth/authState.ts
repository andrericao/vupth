let authenticated = false;

export function isAuthenticated(): boolean {
  return authenticated;
}

export function setAuthenticated(value: boolean): void {
  authenticated = value;
}
