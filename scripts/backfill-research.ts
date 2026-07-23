import { backfillResearch } from "@/lib/research/backfill";

const requested = Number(process.env.BACKFILL_BATCH_SIZE ?? "10");
const result = await backfillResearch(process.cwd(), new Date(), requested);
console.log(
  JSON.stringify(
    {
      added: result.added,
      total: result.total,
      failedCandidates: result.failures.length,
    },
    null,
    2,
  ),
);
