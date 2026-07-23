export const DATA_CHANGED_EVENT = "psychology-daily:data-changed";

export function notifyDataChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}
