import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentUser())) redirect("/login");
  return children;
}
