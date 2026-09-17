import { notFound } from "next/navigation";
import FarmApp from "../../../components/FarmApp";
export default async function ReportPage({ params }) {
  const { view } = await params;
  if (
    !["monthly", "monthly-by-plot", "yearly", "yearly-by-plot"].includes(view)
  )
    notFound();
  return <FarmApp />;
}
