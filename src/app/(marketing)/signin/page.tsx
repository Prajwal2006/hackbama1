import { redirect } from "next/navigation";

/** Auth.js points here; campus sign-in lives at /[campus]/signin. */
export default function SignIn() {
  redirect("/#campuses");
}
