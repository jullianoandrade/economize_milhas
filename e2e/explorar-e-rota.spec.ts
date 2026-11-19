import { expect, test } from "@playwright/test";

/**
 * A pergunta central do app: "vale milhas ou dinheiro para ir a X?".
 *
 * Os numeros dependem do preco do dia (Travelpayouts), entao o teste
 * confere a ESTRUTURA da resposta -- que ela chega, que diz de onde vem
 * cada numero, que leva ao detalhe -- e nao valores.
 */

test("Explorar: um toque no destino traz a resposta e leva ao detalhe da rota", async ({ page }) => {
  await page.goto("/explorar");
  await page.getByRole("button", { name: "Lisboa" }).click();

  const resposta = page.getByRole("region", { name: "Resposta" });
  await expect(resposta).toContainText("Em dinheiro");
  await expect(resposta).toContainText(/Vá de milhas e pague|Pague em dinheiro/);
  // todo numero com a origem dita: busca real ou estimativa
  await expect(resposta).toContainText(/busca real de hoje|preço estimado/);

  await resposta.getByRole("link", { name: "Ver mês, dia e todos os programas" }).click();
  await expect(page).toHaveURL(/\/rota\/[A-Z]{3}\/LIS$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lisboa");
});

test("Explorar: a busca por nome de cidade funciona", async ({ page }) => {
  await page.goto("/explorar");
  await page.getByRole("combobox", { name: "Para onde você vai?" }).fill("Recife");
  await page.getByRole("option", { name: /Recife/ }).first().click();
  await expect(page.getByRole("region", { name: "Resposta" })).toContainText("Em dinheiro");
});

test("Rota: a resposta primeiro, o porque so quando pedido", async ({ page }) => {
  await page.goto("/rota/GRU/LIS");

  const placa = page.getByRole("region", { name: "A resposta" });
  await expect(placa).toContainText(/Vá de milhas e pague|Pague em dinheiro/);
  await expect(placa).toContainText("Em dinheiro");

  const porque = page.locator("details", { has: page.getByText("Por que essa resposta?") });
  await expect(porque).not.toHaveAttribute("open", /.*/);
  await porque.getByText("Por que essa resposta?").click();
  await expect(porque).toHaveAttribute("open", /.*/);

  await expect(page.getByRole("heading", { name: "Quando ir" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como pagar" })).toBeVisible();
});
