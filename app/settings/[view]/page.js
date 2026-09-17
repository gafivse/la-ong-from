import { notFound } from "next/navigation";
import FarmApp from "../../../components/FarmApp";
export default async function SettingsPage({ params }) {
  const { view } = await params;
  if (!["categories", "crop-types", "units", "users"].includes(view))
    notFound();
  return <FarmApp />;
}
