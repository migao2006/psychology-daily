import { updateDailyResearch } from "@/lib/research/update";

async function main() {
  const result = await updateDailyResearch();
  console.log(result.status === "updated" ? `Updated: ${result.research?.id}` : "no_suitable_paper: retained the previous research item");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Daily research update failed");
  process.exitCode = 1;
});
