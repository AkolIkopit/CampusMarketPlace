/*
Module: LoadingScreen.js
Purpose: Presentational loading component shown while async data loads.
Units: CSS import and `LoadingScreen` functional component
Flow: Renders decorative background and simple loading animation used by `App` and routes.
*/

import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <main className="ls-container">
      {/* Aurora background matches your dashboard theme */}
      <section className="aurora-bg" aria-hidden="true">
        <hr className="orb orb-1" />
        <hr className="orb orb-2" />
        <hr className="orb orb-3" />
      </section>

      <article className="ls-content">
        <figure className="ls-animation-wrap">
          <img src="/trolleyPush.png" alt="Loading..." className="ls-graduate-run" />
          <hr className="ls-ground-shadow" />
        </figure>
        <h2 className="ls-text">Loading UniMart...</h2>
      </article>
    </main>
  );
};

export default LoadingScreen;