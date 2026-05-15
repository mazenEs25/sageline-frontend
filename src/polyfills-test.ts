// Polyfill `global` so that sockjs-client (a CommonJS dep transitively imported
// by WebSocketService) can run inside the Karma browser test environment.
// Without this, the test bundle throws "ReferenceError: global is not defined"
// in afterAll, even though every individual test has already passed.
(window as any).global = window;
