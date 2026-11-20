import "./App.css";

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">A keyboard-first browsing prototype</p>
        <h1>TV UI Performance Lab</h1>
      </header>

      <section className="welcome-panel" aria-labelledby="welcome-title">
        <p className="eyebrow">Milestone 1 · Project foundation</p>
        <h2 id="welcome-title">A smoother way to browse</h2>
        <p>
          This original TV-style interface will be built and measured one
          milestone at a time. Synthetic catalog data is ready for the browsing
          experience.
        </p>
        <div className="status-list" aria-label="Project status">
          <span>React + TypeScript</span>
          <span>Synthetic catalog</span>
          <span>Keyboard navigation next</span>
        </div>
      </section>
    </main>
  );
}

export default App;
