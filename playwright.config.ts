import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de jornada: o app inteiro, num navegador de verdade, em dois
 * aparelhos -- um celular (Pixel 7) e um desktop (1440 x 900).
 *
 * Rodam contra o BUILD DE PRODUCAO (next build + next start), nao o
 * servidor de desenvolvimento: e o que a pessoa recebe, com a CSP, o
 * pre-render parcial e os cabecalhos de verdade.
 *
 * Usam o Google Chrome instalado na maquina (channel "chrome") em vez de
 * baixar um navegador a parte.
 *
 * Um trabalhador so: o servidor tem limite de requisicoes por IP (30 por
 * minuto nas rotas que consultam fora), e os dois aparelhos em paralelo
 * batendo do mesmo IP chegariam perto dele.
 *
 *   npm run test:e2e
 */
const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "celular",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
  },
});
