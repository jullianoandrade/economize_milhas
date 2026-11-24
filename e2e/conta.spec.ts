import { expect, test, type Page } from "@playwright/test";

/**
 * Sua conta e Minhas viagens. Tudo fica no aparelho, entao cada teste
 * semeia o localStorage do jeito que os links de passagem gravam
 * (store/viagens) e confere o que a pessoa faz a partir dali.
 */

function isoDaqui(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function viagem(id: string, destinoIata: string, ida: string | null, situacao: string) {
  const agora = new Date().toISOString();
  return {
    id,
    origemIata: "GRU",
    destinoIata,
    ida,
    precoVistoBRL: 480,
    forma: "dinheiro",
    programaId: null,
    situacao,
    criadaEm: agora,
    atualizadaEm: agora,
  };
}

async function semear(page: Page, viagens: unknown[], buscas: unknown[] = []) {
  await page.goto("/");
  await page.evaluate(
    (estado) => {
      localStorage.clear();
      localStorage.setItem("voemilo-viagens", JSON.stringify({ state: estado, version: 1 }));
    },
    { viagens, buscas },
  );
}

test("sem viagens, a tela explica de onde elas vêm", async ({ page }) => {
  await semear(page, []);
  await page.goto("/conta/viagens");
  await expect(page.getByRole("heading", { name: "Minhas viagens" })).toBeVisible();
  await expect(page.getByText("Quando você abre uma passagem pelo app, ela aparece aqui.")).toBeVisible();
});

test("confirmar a reserva leva a viagem para Próximas, com hospedagem nas datas", async ({ page }) => {
  await semear(page, [viagem("v1", "SSA", isoDaqui(40), "em-vista"), viagem("v2", "MIA", isoDaqui(60), "em-vista")]);
  await page.goto("/conta/viagens");

  const salvador = page.getByRole("article", { name: /Salvador/ });
  await salvador.getByRole("button", { name: "Reservei" }).click();
  await salvador.getByLabel("Qual a data da ida?").fill(isoDaqui(45));
  await salvador.getByRole("button", { name: "Guardar reserva" }).click();

  await page.getByRole("article", { name: /Miami/ }).getByRole("button", { name: "Não vou mais" }).click();
  await expect(page.getByRole("article", { name: /Miami/ })).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "Próximas viagens" })).toBeVisible();
  await page.getByRole("button", { name: "Uma noite a mais" }).click();
  await expect(page.locator("output")).toHaveText("4 noites");

  const hospedagem = page.getByRole("link", { name: /Ver hospedagem/ });
  const url = new URL((await hospedagem.getAttribute("href"))!);
  expect(url.searchParams.get("ss")).toBe("Salvador");
  expect(url.searchParams.get("checkin")).toBe(isoDaqui(45));
  expect(url.searchParams.get("checkout")).toBe(isoDaqui(49));

  // fica no aparelho
  await page.reload();
  await expect(page.getByRole("heading", { name: "Próximas viagens" })).toBeVisible();
});

test("a conta resume a próxima viagem e as buscas recentes", async ({ page }) => {
  await semear(
    page,
    [viagem("v1", "LIS", isoDaqui(12), "reservada")],
    [{ origemIata: "GRU", destinoIata: "SSA", em: new Date().toISOString() }],
  );
  await page.goto("/conta");
  await expect(page.getByRole("heading", { name: "Sua conta" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sua próxima viagem: Lisboa/ })).toBeVisible();
  await page.getByRole("link", { name: "São Paulo para Salvador" }).click();
  await expect(page).toHaveURL(/\/rota\/GRU\/SSA/);
});

test("apagar tudo pede confirmação e limpa o aparelho", async ({ page }) => {
  await semear(page, [viagem("v1", "LIS", isoDaqui(12), "reservada")]);
  await page.goto("/conta");
  await page.getByRole("button", { name: "Apagar tudo deste aparelho" }).click();
  await page.getByRole("button", { name: "Manter meus dados" }).click();
  await expect(page.getByRole("link", { name: /Sua próxima viagem/ })).toBeVisible();

  await page.getByRole("button", { name: "Apagar tudo deste aparelho" }).click();
  await page.getByRole("button", { name: "Apagar tudo", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/conta");
  expect(await page.evaluate(() => localStorage.getItem("voemilo-viagens"))).toBeNull();
});

test("o cabeçalho leva para a conta no computador", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/explorar");
  await page.getByRole("banner").getByRole("link", { name: "Sua conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);
});
