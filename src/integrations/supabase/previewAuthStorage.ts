// Simplified preview storage: always use localStorage without external preview synchronization.
export function brokeredPreviewStorage() {
  if (typeof window === 'undefined') return undefined;
  return localStorage;
}
