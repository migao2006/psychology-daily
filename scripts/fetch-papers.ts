import { fetchPapers } from "@/lib/research/fetch";

async function main() {
  const papers = await fetchPapers();
  console.log(JSON.stringify(papers, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Paper fetch failed");
  process.exitCode = 1;
});
