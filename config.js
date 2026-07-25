const isLocalPatio =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "::1";

window.PATIO_CONFIG = {
  convexUrl: isLocalPatio
    ? "https://precious-gecko-619.convex.cloud"
    : "https://judicious-chihuahua-601.convex.cloud",
};
