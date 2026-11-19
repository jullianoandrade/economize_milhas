import { expect, test, type Page } from "@playwright/test";

/**
 * O que e da pessoa: a Carteira e o Objetivo. Tudo fica no aparelho
 * (localStorage), entao cada teste comeca com o armazenamento limpo e
 * confere que o dado sobrevive a um recarregamento.
 */

async function limparAparelho(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

function isoDaqui(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

test("Carteira: guardar um saldo, ver o valor, avisar o vencimento e tirar o programa", async ({ page }) => {
  await limparAparelho(page);
  await page.goto("/carteira");
  await expect(page.getByText("Junte seus programas num lugar só.")).toBeVisible();

  // guardar
  await page.getByRole("button", { name: "Smiles", exact: true }).click();
  const folha = page.getByRole("dialog");
  await folha.getByLabel("Quantas milhas você tem hoje?").fill("32000");
  await folha.getByRole("button", { name: "Guardar na carteira" }).click();

  // o cartao e o valor estimado (32.000 x R$ 16 o milheiro = R$ 512)
  const cartao = page.getByRole("button", { name: /Smiles\s*32\.000/ });
  await expect(cartao).toBeVisible();
  await expect(page.getByText("Seus pontos valem cerca de")).toBeVisible();
  await expect(page.getByText("R$ 512").first()).toBeVisible();
  await expect(page.getByText("saldos informados por você")).toBeVisible();

  // fica no aparelho
  await page.reload();
  await expect(page.getByRole("button", { name: /Smiles\s*32\.000/ })).toBeVisible();

  // vencimento em 10 dias vira aviso
  await page.getByRole("button", { name: /Smiles\s*32\.000/ }).click();
  await page.getByRole("button", { name: "Adicionar vencimento" }).click();
  await page.getByRole("dialog").getByLabel("Quantas milhas vencem?").fill("2000");
  await page.getByRole("dialog").getByLabel("Em que data?").fill(isoDaqui(10));
  await page.getByRole("dialog").getByRole("button", { name: "Guardar vencimento" }).click();
  await expect(page.getByText(/vencem em 10 dias/)).toBeVisible();

  // tirar, com confirmacao
  await page.getByRole("button", { name: "Tirar da carteira" }).click();
  await page.getByRole("button", { name: "Tirar", exact: true }).click();
  await expect(page.getByText("Junte seus programas num lugar só.")).toBeVisible();
});

test("Objetivo: da rota ao objetivo, registrar saldo e ver no Inicio", async ({ page }) => {
  await limparAparelho(page);
  await page.goto("/rota/GRU/LIS");
  await page.getByRole("link", { name: "Ainda não tem as milhas? Guardar como objetivo" }).click();
  await expect(page).toHaveURL(/\/objetivos\?destino=LIS/);

  await page.getByLabel("Quantas milhas você tem hoje").fill("20000");
  await page.getByRole("button", { name: "Criar objetivo" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Lisboa" })).toBeVisible();
  await page.getByLabel("Atualizar o saldo de hoje").fill("21000");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText("+1.000 milhas desde o início")).toBeVisible();

  // o Inicio mostra o objetivo no topo
  await page.goto("/");
  const topo = page.getByRole("region", { name: "Seu objetivo" });
  await expect(topo).toContainText("Lisboa");
  await expect(topo).toContainText(/Faltam .* milhas|Milhas suficientes/);
});
