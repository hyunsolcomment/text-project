import React from 'react';
import ReactDOM from 'react-dom/client';
import './font/GowunDodum.css';
import './index.css';
import './variables';
import './axios';
import { Provider } from 'react-redux';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { store } from './store/store';
import SignPage from './pages/SignPage';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
    <Provider store={store}>
        <HashRouter>
            <Routes>
                <Route path="/sign" element={<SignPage />} />
            </Routes>
        </HashRouter>
    </Provider>
);