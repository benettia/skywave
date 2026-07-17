export default {
  testDir: 'test',
  testMatch: 'smoke.spec.js',
  use: { baseURL: 'http://127.0.0.1:8123' },
  webServer: {
    command: 'python3 -m http.server 8123 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8123/',
    reuseExistingServer: true,
  },
};
