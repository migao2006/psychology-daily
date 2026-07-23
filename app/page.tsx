import { HomeDashboard } from "@/components/progress/home-dashboard";
import { featuredResearch } from "@/lib/content/research";
import { lessons } from "@/lib/content/lessons";

export default function Home() {
  return <HomeDashboard lessons={lessons} featuredResearch={featuredResearch} />;
}
