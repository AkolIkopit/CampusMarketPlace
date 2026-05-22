/*
Module: reportWebVitals.js
Purpose: Performance metrics helper (create-react-app default).
Units: `reportWebVitals` function that can send analytics or log results.
Flow: Exposes a function for optionally reporting metrics to analytics endpoints.
*/

const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
