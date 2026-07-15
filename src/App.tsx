import { BracketView } from './components/BracketView';
import { DraftBoard } from './components/DraftBoard';
import { SetupForm } from './components/SetupForm';
import { TeamsOverview } from './components/TeamsOverview';
import { DraftProvider, useDraft } from './state/DraftContext';
import './App.css';

function Screens() {
  const { phase } = useDraft();

  switch (phase) {
    case 'setup':
      return <SetupForm />;
    case 'drafting':
      return <DraftBoard />;
    case 'teams':
      return <TeamsOverview />;
    case 'bracket':
      return <BracketView />;
  }
}

function App() {
  return (
    <DraftProvider>
      <div className="app-shell">
        <Screens />
      </div>
    </DraftProvider>
  );
}

export default App;
