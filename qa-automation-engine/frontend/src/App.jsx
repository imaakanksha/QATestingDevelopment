import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import JsonComparator from './components/JsonComparator';
import XlsxConverter from './components/XlsxConverter';
import JsonFlattener from './components/JsonFlattener';

function App() {
  const [activeTab, setActiveTab] = useState('comparator');

  return (
    <div className="flex h-screen overflow-hidden bg-background text-slate-800">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-surface z-10 shrink-0 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">
            {activeTab === 'comparator' && 'JSON Comparator'}
            {activeTab === 'converter' && 'Wireframe → JSON Parser'}
            {activeTab === 'flattener' && 'JSON Flattener'}
          </h1>
        </header>

        <div className="flex-1 overflow-auto p-6 relative">
          {activeTab === 'comparator' && <JsonComparator />}
          {activeTab === 'converter' && <XlsxConverter />}
          {activeTab === 'flattener' && <JsonFlattener />}
        </div>
      </main>
      
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#FFFFFF',
          color: '#1E293B',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
        }
      }}/>
    </div>
  )
}

export default App
