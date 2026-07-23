import { fetchPapers } from "@/lib/research/fetch";
const papers = await fetchPapers();
console.log(JSON.stringify(papers, null, 2));
