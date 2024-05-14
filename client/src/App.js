import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';

import './App.css';
import "./components/stylesheets/Index.css";
import "./components/stylesheets/Dashboard.css";
import "./index.css";

import Index from './components/Index';
import Dashboard from './components/Dashboard';
import Loading from './components/Loading';
import Export from './components/Export'

function App() {
  return (
    <Router>

      <div className='App'>

        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/export" element={<Export />} />
          <Route path="/verifyemail/verifyemailsuccess" element={<Loading loadingText={'Email successfully verified. Redirecting...'} redirect={'/'} />} />
          <Route path="/verifyemail/verifyemailerror" element={<Loading loadingText={'Error verifying email. Please try again later.'} />} />
        </Routes>

      </div>

    </Router>
  );
}

export default App;
