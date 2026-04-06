function startHeatmapRefreshJob({ store, intervalMs = 15 * 60 * 1000 }) {
  let timer = setInterval(() => {
    if (store.refreshMaterializedViews) {
      store.refreshMaterializedViews().catch(() => {});
    }
  }, intervalMs);

  async function refreshNow() {
    if (store.refreshMaterializedViews) {
      await store.refreshMaterializedViews();
    }
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    refreshNow,
    stop,
  };
}

module.exports = {
  startHeatmapRefreshJob,
};

