import { redirect } from "next/navigation";

/**
 * Root page — redirects to dashboard or login
 */
export default function HomePage() {
  // TODO: Check auth status and redirect accordingly
  redirect("/login");
}
