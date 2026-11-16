/** Reloads the page. Kept apart so tests can replace it: a browser cannot be told to ignore window.location.reload. */
export const reloadPage = () => window.location.reload();
