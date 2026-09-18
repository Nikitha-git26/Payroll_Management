import Dashboard from "@/components/Dashboard";
import {
  getEnrichedAccounts,
  getFunnelData,
  getKpis,
  getSlaHorizonData,
  getVarianceChartData,
} from "@/lib/data";

export default function Home() {
  const accounts = getEnrichedAccounts();
  const kpis = getKpis();
  const funnelData = getFunnelData();
  const slaHorizonData = getSlaHorizonData();
  const varianceData = getVarianceChartData();

  return (
    <Dashboard
      accounts={accounts}
      kpis={kpis}
      funnelData={funnelData}
      slaHorizonData={slaHorizonData}
      varianceData={varianceData}
    />
  );
}
