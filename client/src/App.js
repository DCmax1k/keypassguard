import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';

import './App.css';
import "./components/stylesheets/Index.css";
import "./components/stylesheets/Dashboard.css";
import "./index.css";

import Index from './components/Index';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Router>

      <div className='App'>

        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>

      </div>

    </Router>
  );
}

export default App;
