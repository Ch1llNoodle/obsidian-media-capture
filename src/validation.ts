/** Treat persisted data and third-party JSON as untrusted values. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function record(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

export function parseJson(value: string): unknown {
    return JSON.parse(value) as unknown;
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

export function scalarText(value: unknown): string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}
