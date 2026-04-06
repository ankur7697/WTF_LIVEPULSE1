import { useState } from 'react';
import { useDashboardState } from '../hooks/useDashboard';

function SimulatorPanel() {
  const { state, actions } = useDashboardState();
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setBusy(true);
    try {
      await actions.startSimulator(speed);
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    try {
      await actions.stopSimulator();
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);
    try {
      await actions.resetSimulator();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <div>
          <h2 className="panel-card__title">Simulator controls</h2>
          <p className="panel-card__subtitle">Start or pause live simulation, change speed, reset back to baseline.</p>
        </div>
      </div>

      <div className="controls-row">
        <div className="control-group">
          <button type="button" className="control-button is-primary" onClick={handleStart} disabled={busy}>
            Start
          </button>
          <button type="button" className="control-button" onClick={handleStop} disabled={busy}>
            Pause
          </button>
          <button type="button" className="control-button" onClick={handleReset} disabled={busy}>
            Reset
          </button>
        </div>

        <div className="control-group">
          <label className="muted" htmlFor="speed-selector">
            Speed
          </label>
          <select
            id="speed-selector"
            className="select-control"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            <option value={1}>1x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
          <span className="pill">{state.simulator.status}</span>
        </div>
      </div>
    </section>
  );
}

export {
  SimulatorPanel,
};

