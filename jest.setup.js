// Optional: configure or set up a testing framework before each test.
import "@testing-library/jest-dom";

// Polyfill for the fetch API
global.fetch = require("node-fetch");