import type { BackfillRejectionCode } from "@/lib/schemas/research";

export class CandidateRejectionError extends Error {
  constructor(
    public readonly code: BackfillRejectionCode,
    message: string,
  ) {
    super(message);
    this.name = "CandidateRejectionError";
  }
}

export function asCandidateRejection(
  error: unknown,
): CandidateRejectionError | null {
  return error instanceof CandidateRejectionError ? error : null;
}
