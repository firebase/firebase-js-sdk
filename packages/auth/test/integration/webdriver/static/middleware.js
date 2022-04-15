export async function attachBlockingMiddleware() {
  auth.beforeAuthStateChanged(() => {
    throw new Error('block state change');
  });
}

export async function attachBlockingMiddlewareOnStart() {
  // Attaches the blocking middleware _immediately_ after auth is initialized,
  // allowing us to test redirect operations.
  const oldStartAuth = window.startAuth;

  window.startAuth = async () => {
    oldStartAuth();
    await attachBlockingMiddleware();
  }
}