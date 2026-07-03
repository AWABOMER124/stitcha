import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "PLATFORM_OWNER") {
    redirect("/admin");
  }

  if (role === "DISTRIBUTOR_OWNER" || role === "DISTRIBUTOR_ADMIN") {
    redirect("/distributor/dashboard");
  }

  redirect("/dashboard");
}
