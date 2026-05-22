/*
Module: reactRouterDomMock.js
Purpose: Test utilities to mock `react-router-dom` navigation and params for unit tests.
Units: mocked router components and helper setters/resetters for `navigate`, `params`, `location`, and `searchParams`.
Flow: Exports lightweight replacements for router hooks/components and imperatively-updatable
  functions tests call to simulate navigation and routing state.
*/

const React = require('react');

let navigateMock = jest.fn();
let params = {};
let location = { pathname: '/', search: '', state: null };
let searchParams = new URLSearchParams();
let setSearchParamsMock = jest.fn((nextParams) => {
  searchParams = new URLSearchParams(nextParams);
});

function BrowserRouter({ children }) {
  return React.createElement(React.Fragment, null, children);
}

function MemoryRouter({ children }) {
  return React.createElement(React.Fragment, null, children);
}

function Routes({ children }) {
  return React.createElement(React.Fragment, null, children);
}

function Route({ element }) {
  return element;
}

function Navigate({ to, replace = false }) {
  return React.createElement(
    'div',
    {
      'data-testid': 'navigate',
      'data-replace': replace ? 'true' : 'false'
    },
    to
  );
}

function useNavigate() {
  return navigateMock;
}

function useParams() {
  return params;
}

function useLocation() {
  return location;
}

function useSearchParams() {
  return [searchParams, setSearchParamsMock];
}

function __setNavigateMock(nextNavigateMock) {
  navigateMock = nextNavigateMock;
}

function __setParams(nextParams = {}) {
  params = nextParams;
}

function __setLocation(nextLocation = {}) {
  location = { pathname: '/', search: '', state: null, ...nextLocation };
}

function __setSearchParams(nextParams = '') {
  searchParams = new URLSearchParams(nextParams);
  setSearchParamsMock = jest.fn((updatedParams) => {
    searchParams = new URLSearchParams(updatedParams);
  });

  return setSearchParamsMock;
}

function __resetRouterMocks() {
  navigateMock = jest.fn();
  params = {};
  location = { pathname: '/', search: '', state: null };
  searchParams = new URLSearchParams();
  setSearchParamsMock = jest.fn((nextParams) => {
    searchParams = new URLSearchParams(nextParams);
  });
}

module.exports = {
  BrowserRouter,
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  __resetRouterMocks,
  __setLocation,
  __setNavigateMock,
  __setParams,
  __setSearchParams
};
