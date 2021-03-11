import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { ButtplugProvider } from '@maustec/react-buttplug'

ReactDOM.render(
    <React.StrictMode>
        <ButtplugProvider serverName={"buttplugs."}>
            <App />
        </ButtplugProvider>
    </React.StrictMode>,
    document.getElementById('root')
);