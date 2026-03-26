import { calculateScope2 } from './calculator.js';

const appState = {
    currentStep: 1,
    location: { country: null, region: null },
    facilities: [],
    data: {}
};

async function init() {
    console.log('Carbon Emission Estimator initialized');
}

init();
