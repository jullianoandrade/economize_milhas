import { expect, test } from "@playwright/test";

/**
 * As quatro abas levam onde dizem, nos dois aparelhos. No celular quem
 * navega e a pilula de baixo; no desktop, a barra do topo. As duas se
 * chamam "Navegacao principal" e so uma fica visivel em cada largura --
 * por isso o mesmo teste serve aos dois.
 */
test("as quatro abas levam as telas certas e marcam a aba ativa", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });

  for (const [rotulo, caminho] of [
    ["Explorar", "/explorar"],
    ["Carteira", "/carteira"],
    ["Oportunidades", "/oportunidades"],
    ["Início", "/"],
  ] as const) {
    await nav.getByRole("link", { name: rotulo }).click();
    await expect(page).toHaveURL(caminho);
    await expect(nav.getByRole("link", { name: rotulo })).toHaveAttribute("aria-current", "page");
  }
});

test("o endereco antigo /promocoes chega em /oportunidades", async ({ page }) => {
  await page.goto("/promocoes");
  await expect(page).toHaveURL("/oportunidades");
  await expect(page.getByRole("heading", { level: 1, name: "Oportunidades" })).toBeVisible();
});

test("Aprender continua alcancavel pelo rodape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Aprender sobre milhas" }).click();
  await expect(page).toHaveURL("/aprender");
});
