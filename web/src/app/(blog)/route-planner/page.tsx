import { permanentRedirect } from "next/navigation";

/**
 * The standalone route-planner page has been retired.
 * All traffic is sent to the public wishlist page which supersedes it.
 */
export default function RoutePlannerPage() {
  permanentRedirect("/wishlist");
}
